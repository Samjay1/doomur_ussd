'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios'); 
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

    let ussd_body;
    console.log('body :>> ', body);
    console.log('body.msg_type :>> ', body.msg_type);

    // msg_type = 0 (new session)
    // Step 1: etickets or evotes selected
    if(body.msg_type == '0'){
        req.session.user = {count:1,session_id: body.session_id};
        console.log('COUNT ', req.session.user.count);
        res.status(200).json(
            {
                msg_type: body.msg_type,
                msisdn: body.msisdn,
                nw_code: body.nw_code,
                service_code: body.service_code,
                session_id: body.session_id,
                ussd_body: 'Welcome to Doomur Services\n1.Events(tickets)\n2.Votes'
            }
        )

 
    }else if(body.msg_type == '1'){ // msg_type = 1 (continue session)
        ussd_body = body.ussd_body;
        let count = req.session.user.count;
         // STEP 2: SELECT FROM THE LIST - eTICKETS OR eVOTES
        if(count===1){
            // Update count value 
            req.session.user.count = 2;
            console.log('COUNT ', req.session.user.count);
            // Eticktes route
            if(ussd_body === '1'){
                // Get Events from db
                let events = EventList.map((value,index)=>{
                    return `\n${++index}.${value.event_name} (GHS ${value.price}) - ${value.event_date}`
                })
                res.status(200).json(
                    {
                        msg_type: body.msg_type,
                        msisdn: body.msisdn,
                        nw_code: body.nw_code,
                        service_code: body.service_code,
                        session_id: body.session_id,
                        ussd_body: `Select an Event ${events}`
                    }
                )

            }
            // Evotes route
            else if(ussd_body==='2'){
                 // Get Events from db
                 let votes = VoteList.map((value,index)=>{
                    return `\n${++index}.${value.event_name} (GHS ${value.price}) - ${value.event_date}`
                })
                res.status(200).json(
                    {
                        msg_type: body.msg_type,
                        msisdn: body.msisdn,
                        nw_code: body.nw_code,
                        service_code: body.service_code,
                        session_id: body.session_id,
                        ussd_body: `Select one to Vote ${votes}`
                    }
                )
            }
            // CLOSING if ussd_body is outside of expected response i.e. 1 or 2
            else{
                res.status(200).json(
                    {
                        msg_type: 2,
                        msisdn: body.msisdn,
                        nw_code: body.nw_code,
                        service_code: body.service_code,
                        session_id: body.session_id,
                        ussd_body: 'closing'
                    }
                )
            }
       // STEP 3: ENTER QUANTITY FOR - eTICKETS OR eVOTES
        }else if(count ===2){
            // Update count value 
            req.session.user.count = 3;
            console.log('COUNT ', req.session.user.count);
            req.session.user.item_index = ussd_body;
            let event_index = --ussd_body;
            let event_selected = EventList.filter((value,index)=>index===event_index)[0];
            // console.log('event_selected :>> ', event_selected,ussd_body);
            res.status(200).json(
                {
                    msg_type: body.msg_type,
                    msisdn: body.msisdn,
                    nw_code: body.nw_code,
                    service_code: body.service_code,
                    session_id: body.session_id,
                    ussd_body: `${event_selected.event_name} (GHS ${event_selected.price}) - ${event_selected.event_date}\nEnter the quantity`
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
            let price = parseInt(ussd_body) * parseFloat(event_selected.price);
            res.status(200).json(
                {
                    msg_type: body.msg_type,
                    msisdn: body.msisdn,
                    nw_code: body.nw_code,
                    service_code: body.service_code,
                    session_id: body.session_id,
                    ussd_body: `Paying an amount of GHS ${price} for ${ussd_body} tickets to ${event_selected.event_name}\nEnter 1 to proceed`
                }
            )
        }
       
        else if(count===4){
            res.status(200).json(
                {
                    msg_type: body.msg_type,
                    msisdn: body.msisdn,
                    nw_code: body.nw_code,
                    service_code: body.service_code,
                    session_id: body.session_id,
                    ussd_body: `Thanks for paying, your ticket will be sent via SMS shortly.`
                }
            )
        }
         

    }else{  // msg_type = 2 (end session)
        res.status(200).json({
            msg_type: body.msg_type,
            msisdn: body.msisdn,
            nw_code: body.nw_code,
            service_code: body.service_code,
            session_id: body.session_id,
            ussd_body: body.ussd_body
        })
    }

    


   
   
})

module.exports = router;
