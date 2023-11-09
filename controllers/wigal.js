'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const random = require('random');
const fs = require('fs')
const axios = require('axios');
const sendSms = require('./sms');
require('dotenv/config'); 

const router = express.Router();

//Set up middlewares
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: false}));
 

const oldDate = new Date()
var date = oldDate.toISOString().split('T')[0];
var time = new Date().toLocaleTimeString();  

let EventList = [
    {
        show_id: '59',
        event_name: "CocoFest",
        event_date: '16th Dec',
        event_time: '2:00 PM',
        price: '50'
    },
    {
        show_id: '000',
        event_name: "Online Classes",
        event_date: '20th Nov',
        event_time: '2:00 PM',
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


router.get('/', (req, res) => {
    
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
 
        userdata= 'Welcome to Doomur Services^1.Events(tickets)'
        res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${1}`)
 
    }else if(mode == 'MORE'){ // msg_type = 1 (continue session)
        // console.log('MORE called')
        let currentPosition = other.split(',')

        console.log('currentPosition :>> ', currentPosition);
        // let count = req.session.user.count || 1;
        // console.log('count :>> ', count);
         // STEP 2: SELECT FROM THE LIST - eTICKETS OR eVOTES
        if(currentPosition[0]=='1' || userdata==='00'){
            // Update count value 
            // req.session.user.count = 2; 
            // console.log('COUNT ', req.session.user.count);
            // Eticktes route
            if(userdata === '1' || userdata==='00'){
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
                res.send(`${network}|END|${msisdn}|${sessionid}|${'Invalid Input, Please try again'}|${username}|${trafficid}|${other}`)
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
            

            userdata= `${event_selected.event_name} (GHS ${event_selected.price}) - ${event_selected.event_date}^Enter the quantity. ^00.Back`
            res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)

         // STEP 4: INITIATE PAYMENT AND SMS RECEIPT
        }else if(currentPosition[0]=='3'){
            // Update count value 
            // req.session.user.count = 4;
         
            // console.log('COUNT ', req.session.user.count);
            // let event_index = req.session.user.item_index;
            let event_index = currentPosition[2];
            let quantity = userdata;

            if (isNaN(quantity)) {
                userdata = 'Quantity must be between 1-10. ^00.Back'
                other = `1,event,${event_index}`;

                res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
            }
            else if (quantity < 1 || quantity > 10) { 
                
                userdata = 'Quantity must be between 1-10. ^00.Back'
                other = `1,event,${event_index}`;

                res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
            } else {
                
                console.log('event_index :>> ',event_index);
                let event_selected = EventList.filter((value,index)=>index===parseInt(event_index))[0];
                console.log('event_selected',event_selected)
                let price = parseInt(quantity) * parseFloat(event_selected.price);
                
                other = `4,event,${event_index},${quantity}`;

                userdata= `Paying an amount of GHS ${price} for ${quantity} ticket(s) to ${event_selected.event_name}^1. Proceed ^00.Back`;
                res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
            }
        }
       
        else if (currentPosition[0] == '4') {
            
            if (userdata == '1') {
                    let event_index = currentPosition[2];
                    let quantity = currentPosition[3] 
                    let event_selected = EventList.filter((value,index)=>index===parseInt(event_index))[0]; 
                    let price = parseInt(quantity) * parseFloat(event_selected.price); 
                    let itemPrice = event_selected.price
                    let eventId  = event_selected.show_id
                    
                    // SENDING SMS
                    let ticketCode = random.int(10000,100000); //create a unique code
                    let showName = event_selected.event_name;
                    let showDate = event_selected.event_date;
                    let showTime = event_selected.event_time; 

        
                    var payload = {
                        msisdn,
                        amount: (parseFloat(price) *1).toString(),
                        mno: network.toUpperCase(),
                        kuwaita:'malipo',
                        refID:`${ticketCode}`
                    }
                    
                    
                    axios.post('http://3.215.156.108:3000/payment/nsano', payload)
                        .then((response) => {
                            console.log('payment/nsano CALLED :>> ', response.data.status);
                            let status = response.data.status
                            if (status) {
                                // send bookings to db
                                let payloadBook = {
                                    eventId, ticketCode, showName,  itemPrice, quantity, showDate, showTime, msisdn,
                                }         
                                // Book show
                                axios.post('https://ussd.doomur.com/book', payloadBook)
                                    .then((response) => {
                                        console.log('BOOKING CALLED :>> ', response.data);
                                        return;
                                    }).catch((error) => {
                                    console.log('https://ussd.doomur.com/book error :>> ', error);
                                    return;
                                }) 
                            
                            } else {
                                // console.log('failed to pay')
                                var message= `Failed to pay.`;
                                sendSms(msisdn,message);  
                            }
                        }).catch((error) => {
                            console.log('aws:3000/payment/nsaon error :>> ', error);
                            return;
                    }) 
                    // END PAYMENT INTEGRATION--------------------------------

                    userdata = 'Please wait for your payment prompt';
                    res.send(`${network}|END|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
                    fs.appendFileSync('finalUssdResponse.txt', `Network:${network}, phone no.:${msisdn}, Session:${sessionid}, Userdata:${userdata}, Username:${username}, TrafficID:${trafficid}, Others:${other}, {${date},${time}}`)
           
            } else {
                    userdata = 'Transaction has been cancelled';
                    res.send(`${network}|END|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
                    
            }
        }

    }else{  // msg_type = 2 (end session)
        // req.session.user.count = 1;
        other = 1;
        console.log('END CALLED')
        userdata = "Invalid Input, Please try again"
        res.send(`${network}|END|${msisdn}|${sessionid}|end: ${userdata}|${username}|${trafficid}`)
    }

} catch (error) {
    // req.session.user.count = 1;
    other = 1;
    console.log('catch error CALLED' , error)
    userdata = "Something went wrong, Please try again"
    res.send(`${network}|END|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}`)
    // throw error;
}
   
})



module.exports = router;
