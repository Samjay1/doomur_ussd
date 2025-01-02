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
        show_id: '65',
        event_name: "Akuapem Nature 1Night",
        event_desc: "Akuapem Nature Retreat (1 night)",
        event_date: '19 Oct',
        event_time: '8:00 AM',
        price: '2500'
    },
    // {
    //     show_id: '65',
    //     event_name: "Akuapem Nature 2Night",
    //     event_desc: "Akuapem Nature Retreat (2 night)",
    //     event_date: '19 Oct',
    //     event_time: '8:00 AM',
    //     price: '6000'
    // },
    // {
    //     show_id: '65',
    //     event_name: "Akuapem Nature 3Night",
    //     event_desc: "Akuapem Nature Retreat (3 night)",
    //     event_date: '19 Oct',
    //     event_time: '8:00 AM',
    //     price: '10000'
    // },
    // {
    //     show_id: '65',
    //     event_name: "Akuapem Nature 4",
    //     event_desc: "Akuapem Nature Retreat (4 night)",
    //     event_date: '28 Sept',
    //     event_time: '8:00 AM',
    //     price: '14000'
    // }, 
    // {
    //     show_id: '66',
    //     event_name: "Drift-Solo",
    //     event_desc:"Drift (Solo Adult)",
    //     event_date: '28 Sept',
    //     event_time: '9:00 AM',
    //     price: '1299'
    // }, 
    // {
    //     show_id: '66',
    //     event_name: "Drift+Adult",
    //     event_desc:"Drift (Adult rider&passenger)",
    //     event_date: '28 Sept',
    //     event_time: '9:00 AM',
    //     price: '1899'
    // }, 
    // {
    //     show_id: '66',
    //     event_name: "Drift+Child",
    //     event_desc:"Drift (Adult rider&child)",
    //     event_date: '28 Sept',
    //     event_time: '9:00 AM',
    //     price: '1799'
    // }, 
    // {
    //     show_id: '000',
    //     event_name: "Big Time Movers",
    //     event_date: '23rd Dec',
    //     event_time: '6:00 PM',
    //     price: '1'
    // },

]
let VoteList = [
    {
        event_id: 4,
        event_name: "Noche D'Amor",
        event_date: '03-01-2025',
        event_time: '10:30',
        price: '.50'
    },
    // {
    //     event_id: 3,
    //     event_name: 'Viva La Vida',
    //     event_date: '13-08-2024',
    //     event_time: '10:30',
    //     price: '.50'
    // },
   
]


// LIVE ENDPOINT
router.get('/vote', (req, res) => {
    
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
 
        userdata= 'Welcome to Doomur Services^1. Events(tickets)^2. Evotes'
        res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${1}`)
 
    }else if(mode == 'MORE'){ // msg_type = 1 (continue session)
        // console.log('MORE called')
        let currentPosition = other.split(',')

        console.log('currentPosition :>> ', currentPosition);

         // STEP 2: SELECT FROM THE LIST - eTICKETS 
        if(currentPosition[0]=='1' || userdata==='00'){
            //eTICKETS 
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
            else if(userdata==='2' || userdata==='00'){
                 // Get Events from db
                 let votes = VoteList.map((value,index)=>{
                    return `^${++index}.${value.event_name}`
                })
                other = '2,vote';
                userdata= `Select one to Vote ${votes}`
                // userdata = 'None Available'
                res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
                // res.send(`${network}|END|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}`)
            }
            // CLOSING if ussd_body is outside of expected response i.e. 1 or 2
            else{
                res.send(`${network}|END|${msisdn}|${sessionid}|${'Invalid Input, Please try again'}|${username}|${trafficid}|${other}`)
            }
       // STEP 3: ENTER QUANTITY FOR - eTICKETS OR eVOTES
        }else if(currentPosition[0]=='2'){
            // Update count value
            // req.session.user.count = 3;
            let vote_index = userdata == 1 ? 2 : 3;
           
            other = `3,votes,${vote_index}`; 

            userdata= `Enter the nominee code^00. Back`
            res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)

         // STEP 4: INITIATE PAYMENT AND SMS RECEIPT
        }else if(currentPosition[0]=='3'){
            // Update count value 
            // req.session.user.count = 4;
         
            // console.log('COUNT ', req.session.user.count);
            // let event_index = req.session.user.item_index;
            let vote_index =  4 //currentPosition[2];
            let nomineeCode = userdata;

            // API call for nominee to get category list (voteIndex and nomineeCode) ---------------------------
            
             // Book show
             axios.get(`https://evoting.doomur.com/api/users/nominations/${vote_index}/${nomineeCode}`)
             .then((response) => {
                 console.log('USER NOMINATION CALLED :>> ', response.data);
                 let name = response.data.user.name;
                 let nominations = response.data.nominations;
                 let saveNominationIds = '';
                 let nominationsList = nominations.map((value, index) => {
                     saveNominationIds += `${value.id}:`;
                    return `^${++index}.${value.category.name}`
                })
              

                 userdata = `Vote for ${name}${nominationsList}^00. Back`
                 other = `4,vote,${vote_index},${nomineeCode},${saveNominationIds}`;
                 console.log('INTERESTED other :>> ', other);
 
                 res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
                 return;
             }).catch((error) => {
                 console.log('FAILED TO GET USER NOMINATIONS :>> ', error);
                 res.send(`${network}|END|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
                   
             return;
             })
            
              
        }
        else if(currentPosition[0]=='4'){
            // Update count value 

            let vote_index = currentPosition[2];
            let nomineeCode = currentPosition[3];
            let saveNominationIds = currentPosition[4];
            let categoryId = --userdata;

            let selectedNominationId = saveNominationIds.split(':').filter((value, index) => {
                console.log('index,categoryId,value :>> ', index, categoryId,value);
                if (index == categoryId) return value;
             
           })

            console.log('selectedNominationId :>> ', selectedNominationId);
            // API call for nominee to get category list ---------------------------
                userdata = 'Enter quantity of votes (1 vote is GHS 1)^00.Back'
                other = `5,vote,${vote_index},${nomineeCode},${selectedNominationId[0]==undefined ? 0:selectedNominationId[0]}`;

            console.log('2. INTERESTED other :>> ', other);
                res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
        }
        // https://ussd.doomur.com/payment
        else if (currentPosition[0] == '5') {
            
            // if (userdata == '1') {
            let vote_index = currentPosition[2];
            let categoryId = currentPosition[2];
            let quantity = userdata 
            let nomineeCode = currentPosition[3]
            let nominationId = currentPosition[4]

            console.log('categoryId,quantity, nomineeCode :>> ', categoryId, quantity, nomineeCode);
          let price = parseFloat(quantity) * 1.0

        
          let refCode = random.int(10000,100000); //create a unique code
                    var payload = {
                        msisdn,
                        amount: (parseFloat(price) *1).toString(),
                        mno: network.toUpperCase(),
                        kuwaita:'malipo',
                        refID:`VOTE-${refCode}-n${nominationId}-${nomineeCode}`
                    }
                    
                    
                    axios.post('http://3.215.156.108:3000/payment/nsano', payload)
                        .then((response) => {
                            console.log('payment/nsano CALLED :>> ', response.data.status);
                            let status = response.data.status
                            if (status) {
                                console.log('VOTE CALLED SUCCESS :>> ');
                                // send bookings to db
                                let payload = {
                                    votesCast:quantity,amountPaid: (parseFloat(quantity)*1.0), refCode:`VOTE-${refCode}-n${nominationId}-${nomineeCode}`, showName:null, quantity, phoneNumber:msisdn,msisdn,
                                }  
                                
                                // Book show
                                axios.post(`https://evoting.doomur.com/api/nominations/vote/${nominationId}`, payload)
                                    .then((response) => {
                                        console.log('VOTING CALLED :>> ', response.data);
                                        return;
                                    }).catch((error) => {
                                    console.log('https://evoting.doomur.com/api error :>> ', error);
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
           
            // } else {
            //         userdata = 'Transaction has been cancelled';
            //         res.send(`${network}|END|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
                    
            // }
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
 
        userdata= 'Welcome to Doomur Services^1.Events(tickets)^2.Evotes'
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
                    return `^${++index}.${value.event_name}`
                })
                other = '2,event';
                userdata= `Events${events}`
                res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
            }
            // Evotes route
            else if(userdata==='2'){
                 // Get Votes from db
                 let votes = VoteList.map((value,index)=>{
                    return `^${++index}.${value.event_name}(GHS ${value.price})`
                })
                other = '2,vote';
                // userdata= `Select one to Vote ${votes}`
               userdata= `Select an Event ${votes}`
                res.send(`${network}|MORE|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`)
                // res.send(`${network}|END|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}`)
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
            

            userdata= `${event_selected.event_desc} (GHS ${event_selected.price}) - ${event_selected.event_date}^Enter the quantity. ^00.Back`
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
       
        else if (currentPosition[0] == '4'){
            
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
