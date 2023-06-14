const axios = require('axios');

 function sendSms(phone,message){
    var url = process.env.SMS_URL;

    var option= {
        username: process.env.SMS_USERNAME,
        password: process.env.SMS_PASSWORD,
        from: process.env.SMS_FROM,
        to: phone,
        message: message
    }
    axios.get(url, {params: option})
    .then((data)=>{ 
        // console.log('data :>> ', data);
        return true;
    })
    .catch((error)=>{
        console.log('error :>> ', error);
        return false
    })
    
}

module.exports = sendSms