const express = require('express')
const router = express.Router();
const fs = require('fs');
const axios = require('axios');

router.get('/test', (req, res) => {
    console.log('Main AWS Server works :>> ');
    res.status(200).json({
        status: true,
        message:"Main aws server works"
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

    fs.writeFileSync('PayloadLogs.txt', JSON.stringify(payload))
        try {
            axios.post('https://fs1.nsano.com:5001/api/fusion/tp/c146b27dce4d44678b970e77288215fd', payload)
                .then((data) => {
                    console.log("NSANO API RESPONSE: ",data.data)
                    let response = data.data;
                    fs.writeFileSync('NsanoSuccess.txt', JSON.stringify(response))
                    
                    return res.status(201).json({
                        status: true,
                        message: "Payment initiated successfully"
                    });
                }).catch((error) => {
                    fs.writeFileSync('NsanoError.txt', JSON.stringify(response))
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