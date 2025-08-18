const express = require("express");
const bodyParser = require("body-parser");
const random = require("random");
const fs = require("fs");
const axios = require("axios");
const sendSms = require("./sms");
const { v4: uuidv4 } = require('uuid');
require("dotenv/config");

const router = express.Router();
 
const serviceType = {
  EVOTE: {index: 1, name: "EVOTE"},
  ETICKET: {index: 2, name: "ETICKET"},
};

router.get("/", (req, res) => {
  let body = req.query;

  let userdata = body.userdata; // user inputs
  var network = body.network; // Network eg. MTN
  var sessionid = body.sessionid; // Session ID
  var mode = body.mode.toString().toUpperCase(); // START | MORE | END
  var msisdn = body.msisdn; // Phone of the user
  var username = body.username; // App Username
  var trafficid = body.trafficid;
  var other = body.other;

  console.log("body :>> ", body);

  try {
    console.log("mode :>> ", mode);
    if (mode == "START") {
      userdata = "Welcome to Doomur Services^1.Votes^2.Tickets";
      return res.send(
        formatResponseFunc({
          mode: "MORE",
          userdata: userdata,
          other: "1",
          network: network,
          msisdn: msisdn,
          sessionid: sessionid,
          username: username,
          trafficid: trafficid,
        })
      );
    }
    if (mode == "MORE") {
      let extracData = extractDataFunc(other);
      console.log("extracData :>> ", extracData);
      if (
        extracData.serviceType == serviceType.EVOTE.name ||
        (parseInt(extracData.position) == 1 &&
          parseInt(userdata) == serviceType.EVOTE.index)
      ) {
        return eVoteFlowFunc(
          userdata,
          parseInt(extracData.position),
          extracData,
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
          res
        );
      } else if (
        extracData.serviceType == serviceType.ETICKET.name ||
        (parseInt(extracData.position) == 1 &&
          parseInt(userdata) == serviceType.ETICKET.index)
      ) {
        return eTicketFlowFunc(
          userdata,
          parseInt(extracData.position),
          extracData,
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
          res
        );
      } else {
        return res.send(
          formatResponseFunc({
            mode: "END",
            userdata: "Error input ll",
            other: "",
            network: network,
            msisdn: msisdn,
            sessionid: sessionid,
            username: username,
            trafficid: trafficid,
          })
        );
      }
    } else {
      console.log("END CALLED");
      userdata = "Invalid Input, Please try again";
      return res.send(
        formatResponseFunc({
          mode: "END",
          userdata: userdata,
          other: "",
          network: network,
          msisdn: msisdn,
          sessionid: sessionid,
          username: username,
          trafficid: trafficid,
        })
      );
    }
  } catch (error) {
    console.log("catch error CALLED", error);
    userdata = "Something went wrong, Please try again";
    return res.send(
      formatResponseFunc({
        mode: "END",
        userdata: userdata,
        other: "",
        network: network,
        msisdn: msisdn,
        sessionid: sessionid,
        username: username,
        trafficid: trafficid,
      })

      //   `${network}|END|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}`
    );
  }
});

const formatResponseFunc = ({
  mode,
  userdata,
  other,
  network,
  msisdn,
  sessionid,
  username,
  trafficid,
}) => {
  return `${network}|${mode}|${msisdn}|${sessionid}|${userdata}|${username}|${trafficid}|${other}`;
};

const extractDataFunc = (other) => {
  try {
    const otherData = other.split(",");
    const position = otherData[0];
    const serviceType = otherData.length > 1 ? otherData[1] : "n/a";
    const userInputs1 = otherData.length > 2 ? otherData[2] : "";
    const userInputs2 = otherData.length > 3 ? otherData[3] : "";

    return {position, serviceType, userInputs1, userInputs2};
  } catch (error) {
    console.log("error :>> ", error);
    return;
  }
};

const eVoteFlowFunc = (
  userdata,
  position,
  extraData,
  network,
  msisdn,
  sessionid,
  username,
  trafficid,
  res
) => {
  switch (position) {
    case 1:
      if (userdata == "00") {
        return res.send(
          formatResponseFunc({
            mode: "MORE",
            userdata: "Welcome to Doomur Services^1.Votes^2.Tickets",
            other: `${position},${serviceType.EVOTE.name}`,
            network: network,
            msisdn: msisdn,
            sessionid: sessionid,
            username: username,
            trafficid: trafficid,
          })
        );
      }

      userdata = "Enter nominee code^00.Back";
      console.log(userdata);
      return res.send(
        formatResponseFunc({
          mode: "MORE",
          userdata: userdata,
          other: `${++position},${serviceType.EVOTE.name}`,
          network: network,
          msisdn: msisdn,
          sessionid: sessionid,
          username: username,
          trafficid: trafficid,
        })
      );
      break;
    case 2:
      let nomimeeCode = userdata;
      if (userdata == "00") {
        return res.send(
          formatResponseFunc({
            mode: "MORE",
            userdata: "Enter nominee code^00.Back",
            other: `${position},${serviceType.EVOTE.name}`,
            network: network,
            msisdn: msisdn,
            sessionid: sessionid,
            username: username,
            trafficid: trafficid,
          })
        );
      }
      // find user by nominee code
      //   get voting price
      let votingPrice = 1;
      userdata = `Vote for John ${nomimeeCode} (1 vote is GHS ${votingPrice}). Enter quantity^00.Back`;
      console.log(userdata);
      other = `${++position},${
        serviceType.EVOTE.name
      },${nomimeeCode},${votingPrice}`;
      console.log(other);
      return res.send(
        formatResponseFunc({
          mode: "MORE",
          userdata: userdata,
          other: `${++position},${
              serviceType.EVOTE.name
            },${nomimeeCode}|${votingPrice}`,
        //   other: "3,EVOTE,NOMINEE,1",
          network: network,
          msisdn: msisdn,
          sessionid: sessionid,
          username: username,
          trafficid: trafficid,
        })
      );
      break;

    case 3:
      let quantity = userdata;

      let nominee = extraData.userInputs1;
      let votePrice = extraData.userInputs2;
      let amount = parseInt(quantity) * parseInt(votePrice);
      console.log("nominee, votePrice :>> ", nominee, votePrice);

      userdata = `Please wait for payment prompt for GHS ${amount}`;
      console.log(userdata);
      other = `${++position},${
        serviceType.EVOTE.name
      },${nominee},${votePrice},${quantity}`;
      console.log(other);

      const refID = uuidv4();

      let payload = {
        msisdn,
        amount: amount,
        mno: network.toUpperCase(),
        kuwaita: "malipo",
        refID: `DRM:${refID}:${nominee}`,
      };
        //   console.log('payload :>> ', payload);
      makePaymentFunc(payload, nominee);
      return res.send(
        formatResponseFunc({
          mode: "END",
          userdata: userdata,
          other: `${++position},${
            serviceType.EVOTE.name
          },${nominee},${votePrice},${quantity}`,
          network: network,
          msisdn: msisdn,
          sessionid: sessionid,
          username: username,
          trafficid: trafficid,
        })
      );
      break;
  }
};

const eTicketFlowFunc = (
  userdata,
  position,
  extraData,
  network,
  msisdn,
  sessionid,
  username,
  trafficid,
  res
) => {

    return res.send(
        formatResponseFunc({
          mode: "END",
          userdata: "No events at the moment",
          other: `${++position},${serviceType.EVOTE.name}`,
          network: network,
          msisdn: msisdn,
          sessionid: sessionid,
          username: username,
          trafficid: trafficid,
        })
      );
//   switch (position) {
    
//     case 1:
//       break;
//   }
};

const makePaymentFunc = (payload, nomimeeCode) => {
  axios
    .post("http://3.215.156.108:3000/payment/nsano", payload)
    .then((response) => {
      console.log("payment/nsano CALLED :>> ", response.data.status);
      let status = response.data.status;
      if (status) {
        // send bookings to db
        // let payloadBook = {
        //   eventId,
        //   ticketCode,
        //   showName,
        //   itemPrice,
        //   quantity,
        //   showDate,
        //   showTime,
        //   msisdn,
        // };
        // // Book show
        // axios
        //   .post("https://ussd.doomur.com/book", payloadBook)
        //   .then((response) => {
        //     console.log("BOOKING CALLED :>> ", response.data);
        //     return;
        //   })
        //   .catch((error) => {
        //     console.log("https://ussd.doomur.com/book error :>> ", error);
        //     return;
        //   });
      } else {
        // console.log('failed to pay')
        var message = `Failed to pay.`;
        sendSms(msisdn, message);
      }
    })
    .catch((error) => {
      console.log("aws:3000/payment/nsaon error :>> ", error.message);
      return;
    });
};

module.exports = router;
