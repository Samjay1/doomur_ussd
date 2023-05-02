'use strict';

const express = require('express');
const cors = require('cors')
const bodyParser = require('body-parser');
require('dotenv/config');
const ussd = require('./controllers/ussd')
// const web_db = require('./models/web');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

// const Web = new web_db();

app.use(cors({
    origin: '*'
}));
var PORT = process.env.PORT || 1234;
app.use('/ussd/', ussd)
app.get('/', (req, res)=>{
    res.send('hello world')
})


app.listen(PORT, console.log('server on 1234'))
