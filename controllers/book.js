const express = require('express')
const router = express.Router();
const fs = require('fs');

const Showdb = require('../models/showdb')
let DB = new Showdb();


const oldDate = new Date()
var date = oldDate.toISOString().split('T')[0];
var time  = new Date().toLocaleTimeString();  


// POST BOOKINGS TO DATABASE
router.post('/', (req, res) => {
    let {eventId, ticketCode, showName, itemPrice, quantity, showDate, showTime, msisdn} = req.body;
    DB.book_show(eventId, ticketCode, showName, 'Regular', itemPrice, quantity, showDate, showTime, msisdn, 3, (response) => { 
        console.log('show booked :>> ', eventId, ticketCode, showName, 'Regular', itemPrice, quantity, showDate, showTime, msisdn, 3);
        fs.appendFileSync('BookingPayload.txt', JSON.stringify({eventId, ticketCode, showName, itemPrice, quantity, showDate, showTime, msisdn},response, date, time))
        return res.status(200).json({ status: true,response, message: "Successful book" });
     })
})


module.exports = router;