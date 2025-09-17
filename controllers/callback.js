const express = require("express");
const router = express.Router();
const fs = require("fs");
const axios = require("axios");
const sendSms = require("./sms");

// const Showdb = require('../models/showdb')
// let DB = new Showdb();

const oldDate = new Date();
var date = oldDate.toISOString().split("T")[0];
var time = new Date().toLocaleTimeString();

// CALLBACK FOR NSANO PAYMENTS
router.post("/", async (req, res) => {
  try {
    let body = req.body;
    fs.appendFileSync("NsanoCallback.txt", JSON.stringify(body, date, time));
    let code = body.code;
    let ticketCode = body.author_ref;
    let transactionID = body.transactionID;
    let amount = body.amount;
    let phone = body.userID;
    let other = `${body.msg}, ${body.date} ${body.authorRefID}, ${body.network}, ${body.reference}, ${body.metadataID}`;

    const nomineeCode =
      body && body.author_ref && body.author_ref.split(":").length > 2
        ? body.author_ref.split(":")[2]
        : "n/a";

    console.log("nomineeCode :>> ", nomineeCode, "code", code);
    if (code == "00") {
      // -----------------------INTERNAL CODE---------------------------------
      fs.appendFileSync("VoterMain.txt", JSON.stringify(body));
      //  let getNomineeRes = await
      axios
        .get(
          `https://api-service.doomur.com/evotes/nominees/code/${nomineeCode.toUpperCase()}`
        )
        .then((response) => {
          console.log("res :>> ", response.data.data);
          let data = response.data.data;

          let nomineeName = data.name;
          let nCode = data.nomineeCode;
          let category = data.category.name;

          console.log("nCode,nomineeName :>> ", nCode, nomineeName);
          //  let categoryName = response.data.category.name

          let payloadBook = {
            nomineeCode: nCode,
            voteQuantity: 1,
            amount: amount,
            voterId: phone,
            meta: {
              ...body,
              location: "",
              device: "ussd",
              campaign: "evote",
            },
          };

          console.log("payloadBook :>> ", payloadBook);
          axios
            .post("https://api-service.doomur.com/evotes/vote", payloadBook)
            .then((response) => {
              console.log("2.response :>> ", response);
              var message = `Thank you for voting for ${nomineeName} in the ${category} category.\nPayment received: GHS ${amount}\nTransaction ID: ${transactionID}
                            \n\nPowered by Doomur – your platform for Evotes and Tickets.
                            \nVisit https://doomur.com to learn more.`;
              sendSms(phone, message);
              return;
            })
            .catch((error) => {
              console.log("error :>> ", error.message);
              fs.appendFileSync(
                "ValidVotesButNotInDB.txt",
                JSON.stringify(body)
              );
              return;
            });
        })
        .catch((error) => {
          console.log("error :>> ", error);
          return;
        });
    } else {
      //Todo: make another request to notification request
      return;
    }
    return res.status(200).json({
      code: body.code,
      msg: body.msg,
    });
  } catch (error) {
    console.log("error :>> ", error);
    return res.status(404).json({});
  }
});

// router.post('/old', (req, res) => {
//     let body = req.body;
//     fs.appendFileSync('NsanoCallback.txt', JSON.stringify(body, date,time))
//     let code = body.code;
//     let ticketCode = body.author_ref;
//     let transactionID = body.transactionID
//     let amount = body.amount;
//     let phone = body.userID;
//     let other = `${body.msg}, ${body.date} ${body.authorRefID}, ${body.network}, ${body.reference}, ${body.metadataID}`
//     if (code == "00") {
//         // TODO: update bookings as paid and adds to payment db
//         DB.add_payment(ticketCode, transactionID, amount, other, phone, (response) => {
//             fs.appendFileSync('BookingSuccessError.txt', JSON.stringify(response, body, date, time))
//             if (response.status) {

//                 var message= `Thank you for choosing Doomur! \nYour Ticket Code is ${ticketCode}.\nAmount paid: GHS ${amount}\nTransactionId: ${transactionID}
//                 \n\nVisit https://doomur.com for more.`;
//                 sendSms(phone,message);
//             }
//         })
//     } else {
//         //Todo: make another request to notification request
//     }
//     return res.status(200).json({
//         code: body.code,
//         msg: body.msg
//     })
// })

module.exports = router;
