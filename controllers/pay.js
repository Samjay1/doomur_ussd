const axios = require('axios');
require('dotenv/config');


var response=[];

function pay(res,amount,phone,network,transId,description){
    var url = process.env.PAY_URL;
    var option= {
        "amount": parseFloat(amount) *100,
        "appid": process.env.PAY_APP_ID,
        "clientreference": process.env.PAY_CLIENT_REFERENCE,
        "clienttransid": transId,
        "description": description,
        "nickname": process.env.PAY_NICKNAME,
        "paymentoption": network.toUpperCase(),
        "walletnumber": phone
    }
    axios.post(url,
        option,
        {
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                "apikey": process.env.API_KEY,
        },
    })
    .then((data)=>{
        console.log(data.data)
        response.push(data.data);
        return response;
    })
    .catch((error)=>{
        console.log(error)
        response.push({status:false});
        return response
    })
    // return response
}

module.exports = pay