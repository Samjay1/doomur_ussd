'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const axios = require('axios'); 
const fs = require('fs')
require('dotenv/config');

const router = express.Router();

//Set up middlewares
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: false}));
 
app.get('/', (req, res)=>{
    res.send('Welcome to Ussd api')
})

module.exports = router;
