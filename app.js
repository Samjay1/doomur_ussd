'use strict';

const express = require('express');
const cors = require('cors')
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

const options ={
    connectionLimit: 50,
    password: process.env.DB_PASS,
    user: process.env.DB_USER,
    database: process.env.MYSQL_DB,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    createDatabaseTable: true
    
}
 
const  sessionStore = new mysqlStore(options);

app.use(session({
    name: 'doomurUssd.sid',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    secret: process.env.SECRET_KEY,
    cookie: {
        maxAge: TWO_HOURS,
        sameSite: true,
        secure: IN_PROD
    }
  }));

// app.use(cookieParser());

// app.use('/', ussd)
app.use('/', wigal)



app.listen(PORT, console.log(`server listening on ${PORT}`))
