const express = require("express");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
require("dotenv/config");

const router = express.Router();

const serviceType = {
  EVOTE: { index: 1, name: "EVOTE" },
};

/**
 * USSD route: voting only. First screen (START) asks for nominee code;
 * no main menu (Votes / Tickets).
 */
router.get("/", (req, res) => {
  let body = req.query;

  let userdata = body.userdata;
  var network = body.network;
  var sessionid = body.sessionid;
  var mode = body.mode.toString().toUpperCase();
  var msisdn = body.msisdn;
  var username = body.username;
  var trafficid = body.trafficid;
  var other = body.other;

  console.log("vote_only body :>> ", body);

  try {
    if (mode == "START") {
      userdata = "Doomur Voting Services^Enter nominee code^^00.Back";
      return res.send(
        formatResponseFunc({
          mode: "MORE",
          userdata,
          other: `2,${serviceType.EVOTE.name}`,
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
        })
      );
    }
    if (mode == "MORE") {
      const extracData = extractDataFunc(other);
      return eVoteOnlyFlowFunc(
        userdata,
        parseInt(extracData.position, 10),
        extracData,
        network,
        msisdn,
        sessionid,
        username,
        trafficid,
        res
      );
    }
    userdata = "Invalid Input, Please try again";
    return res.send(
      formatResponseFunc({
        mode: "END",
        userdata,
        other: "",
        network,
        msisdn,
        sessionid,
        username,
        trafficid,
      })
    );
  } catch (error) {
    console.log("vote_only catch error", error);
    userdata = "Something went wrong, Please try again";
    return res.send(
      formatResponseFunc({
        mode: "END",
        userdata,
        other: "",
        network,
        msisdn,
        sessionid,
        username,
        trafficid,
      })
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
    const svcType = otherData.length > 1 ? otherData[1] : "n/a";
    const userInputs1 = otherData.length > 2 ? otherData[2] : "";
    const userInputs2 = otherData.length > 3 ? otherData[3] : "";
    const userInputs3 = otherData.length > 4 ? otherData[4] : "";
    const userInputs4 = otherData.length > 5 ? otherData[5] : "";

    return {
      position,
      serviceType: svcType,
      userInputs1,
      userInputs2,
      userInputs3,
      userInputs4,
    };
  } catch (error) {
    console.log("extractDataFunc error :>> ", error);
    return {
      position: "1",
      serviceType: "n/a",
      userInputs1: "",
      userInputs2: "",
      userInputs3: "",
      userInputs4: "",
    };
  }
};

const eVoteOnlyFlowFunc = (
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
    case 2: {
      const nomineeCode = userdata;

      if (nomineeCode === "00") {
        return res.send(
          formatResponseFunc({
            mode: "END",
            userdata: "Thank you. Goodbye.",
            other: "",
            network,
            msisdn,
            sessionid,
            username,
            trafficid,
          })
        );
      }

      if (!nomineeCode || String(nomineeCode).trim() === "") {
        return res.send(
          formatResponseFunc({
            mode: "END",
            userdata: "Invalid nominee code. Please try again.",
            other: "",
            network,
            msisdn,
            sessionid,
            username,
            trafficid,
          })
        );
      }

      const votingPrice = 2.0;
      axios
        .get(
          `https://api-service.doomur.com/evotes/nominees/code/${String(
            nomineeCode
          ).toUpperCase()}`
        )
        .then((response) => {
          const ok = response.data.success && response.data.data;
          if (ok) {
            userdata = `Vote ${response.data.data.name} for ${response.data.data.category.name} (1 vote = GHS${votingPrice}). Enter quantity^00.Back`;
            return res.send(
              formatResponseFunc({
                mode: "MORE",
                userdata,
                other: `3,${serviceType.EVOTE.name},${nomineeCode},${votingPrice},${response.data.data.name}`,
                network,
                msisdn,
                sessionid,
                username,
                trafficid,
              })
            );
          }
          userdata = `Nominee Code not valid^00.Back`;
          return res.send(
            formatResponseFunc({
              mode: "MORE",
              userdata,
              other: `2,${serviceType.EVOTE.name}`,
              network,
              msisdn,
              sessionid,
              username,
              trafficid,
            })
          );
        })
        .catch((error) => {
          console.log("vote_only NOMINEE CALL ERROR:>> ", error.message);
          return res.send(
            formatResponseFunc({
              mode: "MORE",
              userdata: "Invalid nominee code. Please try again.^00.Back",
              other: `2,${serviceType.EVOTE.name}`,
              network,
              msisdn,
              sessionid,
              username,
              trafficid,
            })
          );
        });
      break;
    }
    case 3: {
      const quantity = userdata;

      if (quantity === "00") {
        return res.send(
          formatResponseFunc({
            mode: "MORE",
            userdata: "Doomur Services^Enter nominee code^00.Back",
            other: `2,${serviceType.EVOTE.name}`,
            network,
            msisdn,
            sessionid,
            username,
            trafficid,
          })
        );
      }

      if (!quantity || isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) <= 0) {
        return res.send(
          formatResponseFunc({
            mode: "END",
            userdata: "Invalid quantity. Please enter a valid number.",
            other: "",
            network,
            msisdn,
            sessionid,
            username,
            trafficid,
          })
        );
      }

      const nominee = extraData.userInputs1;
      const votePrice = extraData.userInputs2;
      const nomineeName = extraData.userInputs3;
      const amount = parseInt(quantity, 10) * parseFloat(votePrice);
      userdata = `Kindly wait for your payment prompt to confirm payment.`;

      const refID = uuidv4();
      const payload = {
        msisdn,
        nomineeName,
        amount,
        sessionid,
        username,
        mno: network.toUpperCase(),
        kuwaita: "malipo",
        refID: `DRM:${refID}:VOTE:${String(nominee).toUpperCase()}`,
      };

      makePaymentFunc(payload, nominee, quantity);

      let pos = position;
      return res.send(
        formatResponseFunc({
          mode: "END",
          userdata,
          other: `${++pos},${serviceType.EVOTE.name},${nominee},${votePrice},${quantity}`,
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
        })
      );
    }
    default:
      return res.send(
        formatResponseFunc({
          mode: "END",
          userdata: "Session error. Please dial again.",
          other: "",
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
        })
      );
  }
};

const makePaymentFunc = (payload, nomineeCode, quantity) => {
  axios
    .post("http://3.215.156.108:3000/payment/nsano", payload)
    .then((response) => {
      console.log("vote_only payment/nsano :>> ", response.data.status);
    })
    .catch((error) => {
      console.log("vote_only payment/nsano error :>> ", error);
    });
};

module.exports = router;
