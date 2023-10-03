const express = require('express')
const router = express.Router();
const fs = require('fs');
const axios = require('axios');

const sendSms = require('./sms');

const Showdb = require('../models/showdb')
let DB = new Showdb();

const oldDate = new Date()
var date = oldDate.toISOString().split('T')[0];
var time  = new Date().toLocaleTimeString();  

router.get('/test', (req, res) => {
    console.log('final Nsano Route :>> ');
    res.status(200).json({
        status: true,
        message:"final Nsano Route"
    })
})

router.post('/', (req, res) => {
    let body = req.body;
    fs.appendFileSync('NsanoCallback.txt', JSON.stringify(body, date,time))
    let code = body.code;
    let ticketCode = body.refID;
    let transactionID = body.transactionID
    let amount = body.amount;
    let phone = body.userID;
    let other = `${body.msg}, ${body.date} ${body.authorRefID}, ${body.network}, ${body.reference}, ${body.metadataID}`
    if (code == "00") { 
        // TODO: update bookings as paid and adds to payment db
        DB.add_payment(ticketCode, transactionID, amount, other, phone, (response) => {
            fs.appendFileSync('BookingSuccessError.txt', JSON.stringify(response, body, date, time))
            if (response.status) { 

                var message= `Thank you for choosing Doomur! \nYour Ticket Code is ${ticketCode}.\nAmount paid: ${amount}\nTransactionId: ${transactionID}
                \n\nVisit https://doomur.com for more.`;
                sendSms(phone,message);  
            }
        })
    } else {
        //Todo: make another request to notification request
    }
    return res.status(200).json({
        code: body.code,
        msg: body.msg
    })
})


router.post('/nsano', (req, res) => {
    const { msisdn, amount, mno, refID } = req.body;

    var payload = {
        msisdn,
        amount,
        mno,
        kuwaita:'malipo',
        refID
    }

    // var payload1 = {
    //     msisdn:'0504085727',
    //     amount:'100',
    //     mno:'MTN',
    //     kuwaita:'malipo',
    //     refID:'1234567889'
    // }
    console.log('nsano payload :>> ', payload);

    fs.appendFileSync('PayloadLogs.txt', JSON.stringify({payload, date, time}))
        try {
            axios.post('https://fs1.nsano.com:5001/api/fusion/tp/c146b27dce4d44678b970e77288215fd', payload)
                .then((data) => {
                    console.log("NSANO API RESPONSE: ",data.data)
                    let response = data.data;
                    fs.appendFileSync('NsanoSuccess.txt', JSON.stringify(response, date,time))
                    
                    return res.status(201).json({
                        status: true,
                        message: "Payment initiated successfully"
                    });
                }).catch((error) => {
                    fs.appendFileSync('NsanoError.txt', JSON.stringify(response, date,time))
                    return res.status(404).json({
                        status: false,
                        message: "Failed to initiate payment"+ error
                    });
            })
        } catch (error) { 
            // console.log('error :>> ', error);
            return res.status(201).json({
                status: false,
                message: "System: Failed to initiate payment"+ error
            });
        }
        
})


module.exports = router;