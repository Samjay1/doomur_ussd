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

 

app.use('/payment/', nsano)
app.use('/', wigal)
//Callback Url Endpoint

app.get("/home", (req, res) => {
    res.status(200).json({status:true, message:"Welcome to doomur Ussd-final"})
})



app.listen(PORT, console.log(`server listening on ${PORT}`))
