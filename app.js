'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');
const mysqlStore = require('express-mysql-session')(session);
require('dotenv/config');
// const ussd = require('./controllers/ussd');
const wigal = require('./controllers/wigal');

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

// app.use('/', ussd)
app.use('/ussd/', wigal)
//Callback Url Endpoint
app.post("/payment", function (req, res) {
    var data = req.body;

    fs.writeFile('ussd_log.txt', JSON.stringify(data), err => { 
        if (err) throw error;
    })
    res.json({...data});

});

app.get("/home", (req, res) => {
    res.status(200).json({status:true, message:"Welcome to doomur Ussd"})
})



app.listen(PORT, console.log(`server listening on ${PORT}`))
