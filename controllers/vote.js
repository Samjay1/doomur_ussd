const express = require("express");
const bodyParser = require("body-parser");
const random = require("random");
const fs = require("fs");
const axios = require('axios');
const sendSms = require("./sms");
const {v4: uuidv4} = require("uuid");
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
            userdata: "Error input",
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
    const userInputs3 = otherData.length > 4 ? otherData[4] : "";
    const userInputs4 = otherData.length > 5 ? otherData[5] : "";

    return {position, serviceType, userInputs1, userInputs2, userInputs3, userInputs4};
  } catch (error) {
    console.log("error :>> ", error);
    return {
      position: "1",
      serviceType: "n/a",
      userInputs1: "",
      userInputs2: "",
    };
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
      //   if (userdata == "00") {
      //     return res.send(
      //       formatResponseFunc({
      //         mode: "MORE",
      //         userdata: "Welcome to Doomur Services^1.Votes^2.Tickets",
      //         other: `${position},${serviceType.EVOTE.name}`,
      //         network: network,
      //         msisdn: msisdn,
      //         sessionid: sessionid,
      //         username: username,
      //         trafficid: trafficid,
      //       })
      //     );
      //   }

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

      // Validate nominee code input
      if (!nomimeeCode || nomimeeCode.trim() === "") {
        return res.send(
          formatResponseFunc({
            mode: "END",
            userdata: "Invalid nominee code. Please try again.",
            other: "",
            network: network,
            msisdn: msisdn,
            sessionid: sessionid,
            username: username,
            trafficid: trafficid,
          })
        );
      }

      //   if (userdata == "00") {
      //     return res.send(
      //       formatResponseFunc({
      //         mode: "MORE",
      //         userdata: "Enter nominee code^00.Back",
      //         other: `${position},${serviceType.EVOTE.name}`,
      //         network: network,
      //         msisdn: msisdn,
      //         sessionid: sessionid,
      //         username: username,
      //         trafficid: trafficid,
      //       })
      //     );
      //   }
      // find user by nominee code
      //   get voting price
      let votingPrice = 0.7;
      axios
        .get(
          `https://api-service.doomur.com/evotes/nominees/code/${nomimeeCode.toUpperCase()}`
        )
        // .get(`http://localhost:3000/evotes/nominees/code/${nomimeeCode}`)
        .then((response) => {
          console.log("NOMINEE CALLED :>> ", response.data);
          if (response.data.success) {
            userdata = `Vote ${response.data.data.name} for ${response.data.data.category.name} (1 vote = GHS${votingPrice}). Enter quantity^00.Back`;
          } else {
            userdata = `Nominee Code not valid^00.Back`;
          }

          console.log(userdata);
          return res.send(
            formatResponseFunc({
              mode: "MORE",
              userdata: userdata,
              other: `${++position},${
                serviceType.EVOTE.name
              },${nomimeeCode},${votingPrice},${response.data.data.name}`,
              network: network,
              msisdn: msisdn,
              sessionid: sessionid,
              username: username,
              trafficid: trafficid,
            })
          );
        })
        .catch((error) => {
          console.log("NOMINEE CALL ERROR:>> ", error.message);
          return res.send(
            formatResponseFunc({
              mode: "MORE",
              userdata: "Invalid nominee code. Please try again.^00.Back",
              other: "",
              network: network,
              msisdn: msisdn,
              sessionid: sessionid,
              username: username,
              trafficid: trafficid,
            })
          );
        });
      break;

    case 3:
      let quantity = userdata;

      // Validate quantity input
      if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
        return res.send(
          formatResponseFunc({
            mode: "END",
            userdata: "Invalid quantity. Please enter a valid number.",
            other: "",
            network: network,
            msisdn: msisdn,
            sessionid: sessionid,
            username: username,
            trafficid: trafficid,
          })
        );
      }

      let nominee = extraData.userInputs1;
          let votePrice = extraData.userInputs2;
            let nomineeName = extraData.userInputs3;
      let amount = parseInt(quantity) * parseFloat(votePrice);
      console.log("nominee, votePrice :>> ", nominee, votePrice);

      userdata = `Kindly wait for your payment prompt to confirm payment.`;
      console.log(userdata);
      other = `${++position},${
        serviceType.EVOTE.name
      },${nominee},${votePrice},${quantity}`;
      console.log(other);

      const refID = uuidv4();

      let payload = {
          msisdn,
          nomineeName,
        amount: amount,
        sessionid,
        username,
        mno: network.toUpperCase(),
        kuwaita: "malipo",
        refID: `DRM:${refID}:${nominee}`,
      };
      //   console.log('payload :>> ', payload);
      makePaymentFunc(payload, nominee, quantity);
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
      other: `${++position},${serviceType.ETICKET.name}`,
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

const makePaymentFunc = (payload, nomimeeCode, quantity) => {
    // TRIGGER MOMO PROMPT
  axios
    .post("http://3.215.156.108:3000/payment/nsano", payload)
    .then((response) => {
      console.log("payment/nsano CALLED :>> ", response.data.status);
    })
    .catch((error) => {
      console.log("aws:3000/payment/nsano error :>> ", error);
      var message = `Payment failed. Please try again.`;
      // sendSms(payload.msisdn, message);
      return;
    });
};

const oldDate = new Date()
var date = oldDate.toISOString().split('T')[0];
var time = new Date().toLocaleTimeString();  

const makeEvotePaymentFunc = (payload, nomimeeCode, quantity, nomineeName) => {
    console.log('makeEvotePaymentFunc')
  axios
    .post(
      "https://fs1.nsano.com:5001/api/fusion/tp/c146b27dce4d44678b970e77288215fd",
      payload
    )
      .then((data) => {
          console.log('data :>> ', data);
        // logs
      fs.appendFileSync(
        "NsanoSuccess.txt",
        JSON.stringify(response, date, time)
      );
        // send bookings to db
        let payloadBook = {
          nomineeCode: nomimeeCode,
          voteQuantity: quantity,
          amount: payload.amount,
          voterId: payload.msisdn,
          meta: {
            ...payload,
            location: "",
            device: "ussd",
            campaign: "evote",
          },
        };
        // Book show
        axios
          .post("https://api-service.doomur.com/evotes/vote", payloadBook)
          .then((response) => {
            // console.log("payloadBook :>> ", payloadBook);
              // console.log("BOOKING CALLED :>> ", response.data);
              var message = `Thank you for voting for ${nomineeName}.\nAmount paid: GHS ${amount}\nTransactionId: ${transactionID}
               \n\nChoose Doomur for Evotes and Tickets.  
              \nVisit https://doomur.com for more.`;
              sendSms(payload.msisdn, message)
            return;
          })
          .catch((error) => {
            console.log("https://ussd.doomur.com/book error :>> ", error);
            return;
          });
    
    })
      .catch((error) => {
          fs.appendFileSync('NsanoError.txt', JSON.stringify(error.message, date, time))
      console.log("/payment/nsano error :>> ", error.message);
      return;
    });
};

module.exports = router;
