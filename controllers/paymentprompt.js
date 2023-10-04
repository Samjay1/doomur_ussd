const express = require('express')
const router = express.Router();
const fs = require('fs');
const axios = require('axios');


const oldDate = new Date()
var date = oldDate.toISOString().split('T')[0];
var time  = new Date().toLocaleTimeString();  



//TRIGGERS PAYMENTS PROMPT
router.post('/nsano', (req, res) => {
    const { msisdn, amount, mno, refID } = req.body;

    var payload = {
        msisdn,
        amount,
        mno,
        kuwaita:'malipo',
        refID
    }
 
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