const express = require('express')
const router = express.Router();
const fs = require('fs');

const sendSms = require('./sms');

const Showdb = require('../models/showdb')
let DB = new Showdb();


const oldDate = new Date()
var date = oldDate.toISOString().split('T')[0];
var time  = new Date().toLocaleTimeString();  


// CALLBACK FOR NSANO PAYMENTS
router.post('/', (req, res) => {
    let body = req.body;
    fs.appendFileSync('NsanoCallback.txt', JSON.stringify(body, date,time))
    let code = body.code;
    let ticketCode = body.author_ref;
    let transactionID = body.transactionID
    let amount = body.amount;
    let phone = body.userID;
    let other = `${body.msg}, ${body.date} ${body.authorRefID}, ${body.network}, ${body.reference}, ${body.metadataID}`
    if (code == "00") { 
        // TODO: update bookings as paid and adds to payment db
        DB.add_payment(ticketCode, transactionID, amount, other, phone, (response) => {
            fs.appendFileSync('BookingSuccessError.txt', JSON.stringify(response, body, date, time))
            if (response.status) { 

                var message= `Thank you for choosing Doomur! \nYour Ticket Code is ${ticketCode}.\nAmount paid: GHS ${amount}\nTransactionId: ${transactionID}
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

module.exports = router;