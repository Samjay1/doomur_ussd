'use strict';

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs')
const axios = require('axios');
// const mysqlStore = require('express-mysql-session')(session);
require('dotenv/config');
// const ussd = require('./controllers/ussd');
const wigal = require('./controllers/wigal');
const nsano = require('./controllers/nsano');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

// const Web = new web_db();

app.use(cors({
    origin: '*'
}));


const PORT = process.env.APP_PORT;
const IN_PROD = process.env.NODE_ENV === 'production'
const TWO_HOURS = 1000 * 60 * 60 * 2
const TWO_MINUTES = 1000 * 60 * 2

// const options ={
//     connectionLimit: 50,
//     password: process.env.DB_PASS,
//     user: process.env.DB_USER,
//     database: process.env.MYSQL_DB,
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     createDatabaseTable: true
    
// }
 
// const  sessionStore = new mysqlStore(options);

// app.use(session({
//     name: 'doomurUssd.sid',
//     resave: false,
//     saveUninitialized: false,
//     store: sessionStore,
//     secret: process.env.SECRET_KEY,
//     cookie: {
//         maxAge: TWO_MINUTES,
//         sameSite: true,
//         secure: IN_PROD
//     }
//   }));

// app.use(cookieParser());

app.use('/payment/', nsano)
app.use('/', wigal)
//Callback Url Endpoint

app.get("/home", (req, res) => {
    res.status(200).json({status:true, message:"Welcome to doomur Ussd"})
})

app.get('/test', (req, res) => {
    axios.post('http://3.215.156.108:3000/payment/test', payload)
                .then((response) => {
                    console.log('test/response :>> ', response.data.status);
                    let status = response.data.status
                    if (status) {
                        res.send(response.data.message)
                        // var message= `Thank you for choosing Doomur! \nYour Ticket Code is ${ticketCode} for ${showName}.\nQuantity: ${quantity}\nCost: GHS ${price}\nDate: ${showDate} \nTime: ${showTime}
                        // \n\nVisit https://doomur.com for more.`;
                        // sendSms(msisdn,message);  
                    } else {
                        // console.log('failed to pay')
                        // var message= `Failed to pay.`;
                        // sendSms(msisdn,message);  
                    }
                }).catch((error) => {
                    console.log('error :>> ', error);
                    return res.send(error)
                 
            })
})



app.listen(PORT, console.log(`server listening on ${PORT}`))
