'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs')
require('dotenv/config');

const router = express.Router();

//Set up middlewares
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: false}));
 

let EventList = [
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
router.get('/', (req, res)=>{
    res.send('Welcome to Ussd api')
})

router.post('/', (req,res)=>{
    let body = req.body;

    let userdata = body.userdata;
    console.log('body :>> ', body);

    try {
        
    
    // msg_type = 0 (new session)
    // Step 1: etickets or evotes selected
    if(body.mode == 'START'){
        let my_body = {
            network: body.network, // Network eg. MTN
            sessionid: body.sessionid,// Session ID
            mode: body.mode, // START | MORE | END
            msisdn: body.msisdn, // Phone of the user
            userdata: body.userdata, // Data from user or content provider
            username: body.username, // App Username
            trafficid: body.trafficid,
            other: body.other // other information
        }

        req.session.user = {count:1,session_id: my_body.sessionid};
        console.log('COUNT ', req.session.user.count);

        res.status(200).json(
            {
                network: body.network, // Network eg. MTN
                sessionid: body.sessionid,// Session ID
                mode: body.mode, // START | MORE | END
                msisdn: body.msisdn, // Phone of the user
                userdata: 'Welcome to Doomur Services^1.Events(tickets)^2.Votes',
                username: body.username, // App Username
                trafficid: body.trafficid,
                other: body.other
            }
        )
 
    }else if(body.mode == 'MORE'){ // msg_type = 1 (continue session)
        let count = req.session.user.count;
         // STEP 2: SELECT FROM THE LIST - eTICKETS OR eVOTES
        if(count===1){
            // Update count value 
            req.session.user.count = 2;
            console.log('COUNT ', req.session.user.count);
            // Eticktes route
            if(userdata === '1'){
                // Get Events from db
                let events = EventList.map((value,index)=>{
                    return `^${++index}.${value.event_name} (GHS ${value.price}) - ${value.event_date}`
                })
                res.status(200).json(
                    {
                        network: body.network, // Network eg. MTN
                        sessionid: body.sessionid,// Session ID
                        mode: body.mode, // START | MORE | END
                        msisdn: body.msisdn, // Phone of the user 
                        username: body.username, // App Username
                        trafficid: body.trafficid,
                        other: body.other,
                        userdata: `Select an Event ${events}`,
                    }
                )
            }
            // Evotes route
            else if(userdata==='2'){
                 // Get Events from db
                 let votes = VoteList.map((value,index)=>{
                    return `^${++index}.${value.event_name} (GHS ${value.price}) - ${value.event_date}`
                })
                res.status(200).json(
                    {
                        network: body.network, // Network eg. MTN
                        sessionid: body.sessionid,// Session ID
                        mode: body.mode, // START | MORE | END
                        msisdn: body.msisdn, // Phone of the user 
                        username: body.username, // App Username
                        trafficid: body.trafficid,
                        other: body.other,
                        userdata: `Select one to Vote ${votes}`
                    }
                )
            }
            // CLOSING if ussd_body is outside of expected response i.e. 1 or 2
            else{
                res.status(200).json(
                    {
                        network: body.network, // Network eg. MTN
                        sessionid: body.sessionid,// Session ID
                        mode: 'END', // START | MORE | END
                        msisdn: body.msisdn, // Phone of the user 
                        username: body.username, // App Username
                        trafficid: body.trafficid,
                        other: body.other,
                        userdata: body.userdata
                    }
                )
            }
       // STEP 3: ENTER QUANTITY FOR - eTICKETS OR eVOTES
        }else if(count ===2){
            // Update count value 
            req.session.user.count = 3;
            console.log('COUNT ', req.session.user.count);
            req.session.user.item_index = userdata;
            let event_index = --userdata;
            let event_selected = EventList.filter((value,index)=>index===event_index)[0];
            // console.log('event_selected :>> ', event_selected,ussd_body);
            res.status(200).json(
                {
                    network: body.network, // Network eg. MTN
                    sessionid: body.sessionid,// Session ID
                    mode: body.mode, // START | MORE | END
                    msisdn: body.msisdn, // Phone of the user 
                    username: body.username, // App Username
                    trafficid: body.trafficid,
                    other: body.other,
                    userdata: `${event_selected.event_name} (GHS ${event_selected.price}) - ${event_selected.event_date}^Enter the quantity`
                }
            )

         // STEP 4: INITIATE PAYMENT AND SMS RECEIPT
        }else if(count===3){
            // Update count value 
            req.session.user.count = 4;
            console.log('COUNT ', req.session.user.count);
            let event_index = req.session.user.item_index;
            --event_index;
            let event_selected = EventList.filter((value,index)=>index===event_index)[0];
            console.log(event_selected)
            let price = parseInt(userdata) * parseFloat(event_selected.price);
            res.status(200).json(
                {
                    network: body.network, // Network eg. MTN
                    sessionid: body.sessionid,// Session ID
                    mode: body.mode, // START | MORE | END
                    msisdn: body.msisdn, // Phone of the user 
                    username: body.username, // App Username
                    trafficid: body.trafficid,
                    other: body.other,
                    userdata: `Paying an amount of GHS ${price} for ${userdata} tickets to ${event_selected.event_name}^Enter 1 to proceed`
                }
            )
        }
       
        else if(count===4){
            res.status(200).json(
                {
                    network: body.network, // Network eg. MTN
                    sessionid: body.sessionid,// Session ID
                    mode:'END', // START | MORE | END
                    msisdn: body.msisdn, // Phone of the user 
                    username: body.username, // App Username
                    trafficid: body.trafficid,
                    other: body.other,
                    userdata: `Thanks for paying, your ticket will be sent via SMS shortly.`
                }
            )
        }
         

    }else{  // msg_type = 2 (end session)
        req.session.user.count = 1;
        res.status(200).json({
            network: body.network, // Network eg. MTN
            sessionid: body.sessionid,// Session ID
            mode: 'END', // START | MORE | END
            msisdn: body.msisdn, // Phone of the user 
            username: body.username, // App Username
            trafficid: body.trafficid,
            other: body.other,
            userdata: body.ussd_body
        })
    }

} catch (error) {
    req.session.user.count = 1;
    res.status(200).json({
        network: body.network, // Network eg. MTN
        sessionid: body.sessionid,// Session ID
        mode: 'END', // START | MORE | END
        msisdn: body.msisdn, // Phone of the user 
        username: body.username, // App Username
        trafficid: body.trafficid,
        other: body.other,
        userdata: body.ussd_body
    })
}
    


   
   
})

module.exports = router;
