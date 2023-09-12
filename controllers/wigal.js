'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const random = require('random');
const fs = require('fs')
const axios = require('axios');
const sendSms = require('./sms');
const pay = require('./pay');
require('dotenv/config');
const { networkInterfaces } = require('os');

const router = express.Router();

//Set up middlewares
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: false}));
 

let EventList = [
    {
        event_name: 'Doomur Opening',
        event_date: '20-09-2023',
        event_time: '10:30 PM',
        price: '1'
    },
    {
        event_name: 'Afrobeats Music',
        event_date: '27-12-2023',
        event_time: '4:30 PM',
        price: '1'
    },
   
]
let VoteList = [
    {
        event_name: 'Show 1',
        event_date: '20-05-2023',
        event_time: '10:30',
        price: '250'
    },
    {
        event_name: 'Show 2',
        event_date: '20-05-2023',
        event_time: '10:30',
        price: '350'
    }
]
router.get('/home', (req, res)=>{
   
    // let payStatus = pay(100,'233547785025','MTN','Dsdf','description')
    // console.log("paystatus",payStatus)
    res.send('Welcome to Ussd api')
    
})

router.get('/', (req, res) => {
   

    const nets = networkInterfaces();
    const results = Object.create(null); // Or just '{}', an empty object

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
            const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
            if (net.family === familyV4Value && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
                console.log('results[name] :>> ', results[name]);
                fs.writeFileSync('IPfile.txt', results[name])
            }
        }
    }
    
    let body = req.query;

    let userdata = body.userdata;
    console.log('body :>> ', body);

    try {
        var network= body.network; // Network eg. MTN
        var sessionid= body.sessionid;// Session ID
        var mode = body.mode.toString().toUpperCase(); // START | MORE | END
        var msisdn= body.msisdn; // Phone of the user 
        var username= body.username; // App Username
        var trafficid= body.trafficid;
        var other= body.other || 'none';
        console.log('mode :>> ', mode);
    
    // msg_type = 0 (new session)
    // Step 1: etickets or evotes selected
    if(mode === 'START'){
        console.log('START called')

        // req.session.user = {count:1,session_id: sessionid};
        // console.log('COUNT ', req.session.user.count);
 
        userdata= 'Welcome to Doomur Services^1.Events(tickets)^2.Votes'
        res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${1}`)
 
    }else if(mode == 'MORE'){ // msg_type = 1 (continue session)
        console.log('MORE called')
        let currentPosition = other.split(',')

        console.log('currentPosition :>> ', currentPosition);
        // let count = req.session.user.count || 1;
        // console.log('count :>> ', count);
         // STEP 2: SELECT FROM THE LIST - eTICKETS OR eVOTES
        if(currentPosition[0]=='1'){
            // Update count value 
            // req.session.user.count = 2; 
            // console.log('COUNT ', req.session.user.count);
            // Eticktes route
            if(userdata === '1'){
                // Get Events from db
                let events = EventList.map((value,index)=>{
                    return `^${++index}.${value.event_name} (GHS ${value.price}) - ${value.event_date}`
                })
                other = '2,event';
                userdata= `Select an Event ${events}`
                res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
            }
            // Evotes route
            else if(userdata==='2'){
                 // Get Events from db
                 let votes = VoteList.map((value,index)=>{
                    return `^${++index}.${value.event_name} (GHS ${value.price}) - ${value.event_date}`
                })
                other = '2,vote';
                // userdata= `Select one to Vote ${votes}`
                userdata = 'None Available'
                // res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
                res.send(`${network}|END|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}`)
            }
            // CLOSING if ussd_body is outside of expected response i.e. 1 or 2
            else{
                res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
            }
       // STEP 3: ENTER QUANTITY FOR - eTICKETS OR eVOTES
        }else if(currentPosition[0]=='2'){
            // Update count value 
            // req.session.user.count = 3;
           
            // console.log('COUNT ', req.session.user.count);
            // req.session.user.item_index = userdata;
            let event_index = --userdata;
            let event_selected = EventList.filter((value,index)=>index===event_index)[0];
            // console.log('event_selected :>> ', event_selected,ussd_body);
            other = `3,event,${event_index}`;
            

            userdata= `${event_selected.event_name} (GHS ${event_selected.price}) - ${event_selected.event_date}^Enter the quantity`
            res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)

         // STEP 4: INITIATE PAYMENT AND SMS RECEIPT
        }else if(currentPosition[0]=='3'){
            // Update count value 
            // req.session.user.count = 4;
         
            // console.log('COUNT ', req.session.user.count);
            // let event_index = req.session.user.item_index;
            let event_index = currentPosition[2];
            let quantity = userdata;
            console.log('event_index :>> ',event_index);
            let event_selected = EventList.filter((value,index)=>index===parseInt(event_index))[0];
            console.log('event_selected',event_selected, EventList)
            let price = parseInt(quantity) * parseFloat(event_selected.price);
            
            other = `4,event,${event_index},${quantity}`;

            userdata= `Paying an amount of GHS ${price} for ${quantity} tickets to ${event_selected.event_name}^Enter 1 to proceed`;

          
           

            res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
        }
       
        else if(currentPosition[0]=='4'){

            let event_index = currentPosition[2];
            let quantity = currentPosition[3] 
            let event_selected = EventList.filter((value,index)=>index===parseInt(event_index))[0]; 
            let price = parseInt(quantity) * parseFloat(event_selected.price); 
            
            // SENDING SMS
            let ticketCode = random.int(10000,100000); //create a unique code
            let showName = event_selected.event_name;
            let showDate = event_selected.event_date;
            let showTime = event_selected.event_time; 


            // PAYMENT INTEGRATION--------------------------------
            // let payStatus =  pay(price, msisdn, network, ticketCode, 'Thanks for using Doomur.');
            // console.log("paystatus",payStatus)

            let transactionID = random.int(100000000,999999999); //create a unique code
            var url = process.env.PAY_URL;
            // res.send(`${network}|END|${msisdn}|${sessionid}|Kindly wait for payment prompt|${username}|${trafficid}|${other}`)
            
            // req.session.destroy();

            var option= {
                "amount": parseFloat(price) *1,
                "appid": process.env.PAY_APP_ID,
                "clientreference": `REF-${ticketCode}`,
                "clienttransid": trafficid,
                "description": 'Thanks for using Doomur.',
                "nickname": process.env.PAY_CLIENT_REFERENCE,
                "paymentoption": network.toUpperCase(),
                "walletnumber": msisdn,
                "vouchercode":"",
                "ussdtrafficid": trafficid,
                "brandtransid": trafficid
            }

            var payload = {
                'msisdn':'0547785025',
                'amount':'100',
                'mno':'MTN',
                'kuwaita':'malipo',
                'refID':`${transactionID}`
            }
            
            var nsanoUrl = process.env.NSANO_URL + process.env.NSANO_KEY;
            console.log('payload, nsanoUrl :>> ', payload, nsanoUrl);
            fs.writeFileSync('PayloadLogs.txt', JSON.stringify(payload))
            setTimeout(() => { 
                axios.post(nsanoUrl,
                    payload,
                    {
                        headers: {
                            'Content-Type': 'x-www-form-urlencoded',
                            // "ApiKey": process.env.API_KEY,
                    },
                })
                .then((data)=>{
                    console.log(data.data)
                    let response = data.data;
                    fs.writeFileSync('PaymentUssdLogs.txt', JSON.stringify(response))
                    var message= `Thank you for choosing Doomur! \nYour Ticket Code is ${ticketCode} for ${showName}.\nQuantity: ${quantity}\nCost: GHS ${price}\nDate: ${showDate} \nTime: ${showTime}
                    \n\nVisit https://doomur.com for more. \nSession ID:${sessionid} \nTransaction ID:${transactionID} \ntrafficid:${trafficid}`;
                    sendSms(msisdn,message); 
                    userdata = response.reason;
                    fs.writeFileSync('UssdLogs.txt', `Network:${network}, phone no.:${msisdn}, Session:${sessionid}, Userdata:${userdata}, Username:${username}, TrafficID:${trafficid}, Others:${other}`)
                    res.send(`${network}|END|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
                })
                    .catch((error) => {
                        var os = require('os');

                        var networkInterfaces = os.networkInterfaces();
                        
                        console.log(networkInterfaces);

                    console.log(error)
                    userdata = `Please try again`;
                    fs.writeFileSync('UssdLogs.txt', `Network:${network}, phone no.:${msisdn}, Session:${sessionid}, Userdata:${userdata}, Username:${username}, TrafficID:${trafficid}, error:${error}`)
                    
                    res.send(`${network}|END|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
                })
            },5000)
             // END PAYMENT INTEGRATION--------------------------------
        }

    }else{  // msg_type = 2 (end session)
        // req.session.user.count = 1;
        other = 1;
       console.log('END called')
        res.send(`${network}|END|${msisdn}|${sessionid}|end: ${userdata}|${username}|${trafficid}`)
    }

} catch (error) {
    // req.session.user.count = 1;
    other = 1;
    console.log('catch error' , error)
   
    res.send(`${network}|END|${msisdn}|${sessionid}|error: ${error}|${username}|${trafficid}`)
    // throw error;
}  
   
})


router.get('/pay', (req, res) => { 
    var payload = {
        msisdn:'0547785025',
        amount:'100',
        mno:'MTN',
        kuwaita:'malipo',
        refID:'1234567889'
    }

    try {
        axios.post('https://fs1.nsano.com:5001/api/fusion/tp/c146b27dce4d44678b970e77288215fd', payload)
            .then((data) => {
                console.log(data.data)
                let response = data.data;
                fs.writeFileSync('response.txt', JSON.stringify(response))
            res.status(200).json({status:true, message:"Success: ", response})
            }).catch((error) => {
            res.status(409).json({status:false,message:"REQUEST ERROR: "+ error})
        })
    } catch (error) {
        res.status(500).json({status:false,message:"System failed"})
    }
})
module.exports = router;
