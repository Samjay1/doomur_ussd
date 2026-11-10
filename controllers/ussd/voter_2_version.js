const express = require("express");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
require("dotenv/config");

const router = express.Router();

const serviceType = {
  EVOTE: { index: 1, name: "EVOTE" },
};

/**
 * Smart USSD V2 — voting only (JSON POST).
 * First screen (START) asks for nominee code; no main menu.
 */

router.get("/health", (req, res) => {
  return res.json({
    status: true,
    message: "Welcome to Doomur Voting Services",
  });
});

router.post("/", (req, res) => {
  const body = req.body || {};

  let userdata = body.userdata;
  const network = body.network;
  const sessionid = body.sessionid;
  const mode = String(body.mode || "")
    .toUpperCase()
    .trim();
  const phonenumber = body.phonenumber;
  const username = body.username;
  const trafficid = body.trafficid;
  const other = body.other ?? "";

  console.log("voter_2_version body :>> ", body);

  if (!mode) {
    return res.status(400).json({
      status: false,
      message: "Missing required field: mode",
    });
  }

  const session = { network, sessionid, phonenumber, username, trafficid };

  try {
    if (mode === "START") {
      userdata = "Doomur Voting Services^Enter nominee code^^00.Back";
      return res.json(
        formatJsonResponse({
          mode: "MORE",
          userdata,
          other: `2,${serviceType.EVOTE.name}`,
          ...session,
        })
      );
    }

    if (mode === "MORE") {
      const extraData = extractDataFunc(other);
      return eVoteOnlyFlowFunc(
        userdata,
        parseInt(extraData.position, 10),
        extraData,
        session,
        res
      );
    }

    userdata = "Invalid Input, Please try again";
    return res.json(
      formatJsonResponse({
        mode: "END",
        userdata,
        other: "",
        ...session,
      })
    );
  } catch (error) {
    console.log("voter_2_version catch error", error);
    userdata = "Something went wrong, Please try again";
    return res.json(
      formatJsonResponse({
        mode: "END",
        userdata,
        other: "",
        ...session,
      })
    );
  }
});

const formatJsonResponse = ({
  mode,
  userdata,
  other,
  network,
  phonenumber,
  sessionid,
  username,
  trafficid,
}) => ({
  network,
  sessionid,
  mode,
  phonenumber,
  userdata,
  username,
  trafficid,
  other: other ?? "",
});

const extractDataFunc = (other) => {
  try {
    const otherData = String(other || "").split(",");
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

const eVoteOnlyFlowFunc = (userdata, position, extraData, session, res) => {
  const { network, phonenumber, sessionid, username, trafficid } = session;

  switch (position) {
    case 2: {
      const nomineeCode = userdata;

      if (nomineeCode === "00") {
        return res.json(
          formatJsonResponse({
            mode: "END",
            userdata: "Thank you. Goodbye.",
            other: "",
            network,
            phonenumber,
            sessionid,
            username,
            trafficid,
          })
        );
      }

      if (!nomineeCode || String(nomineeCode).trim() === "") {
        return res.json(
          formatJsonResponse({
            mode: "END",
            userdata: "Invalid nominee code. Please try again.",
            other: "",
            network,
            phonenumber,
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
            return res.json(
              formatJsonResponse({
                mode: "MORE",
                userdata,
                other: `3,${serviceType.EVOTE.name},${nomineeCode},${votingPrice},${response.data.data.name}`,
                network,
                phonenumber,
                sessionid,
                username,
                trafficid,
              })
            );
          }
          userdata = "Nominee Code not valid^00.Back";
          return res.json(
            formatJsonResponse({
              mode: "MORE",
              userdata,
              other: `2,${serviceType.EVOTE.name}`,
              network,
              phonenumber,
              sessionid,
              username,
              trafficid,
            })
          );
        })
        .catch((error) => {
          console.log("voter_2_version NOMINEE CALL ERROR:>> ", error.message);
          return res.json(
            formatJsonResponse({
              mode: "MORE",
              userdata: "Invalid nominee code. Please try again.^00.Back",
              other: `2,${serviceType.EVOTE.name}`,
              network,
              phonenumber,
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
        return res.json(
          formatJsonResponse({
            mode: "MORE",
            userdata: "Doomur Services^Enter nominee code^00.Back",
            other: `2,${serviceType.EVOTE.name}`,
            network,
            phonenumber,
            sessionid,
            username,
            trafficid,
          })
        );
      }

      if (
        !quantity ||
        isNaN(parseInt(quantity, 10)) ||
        parseInt(quantity, 10) <= 0
      ) {
        return res.json(
          formatJsonResponse({
            mode: "END",
            userdata: "Invalid quantity. Please enter a valid number.",
            other: "",
            network,
            phonenumber,
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
      userdata = "Kindly wait for your payment prompt to confirm payment.";

      const refID = uuidv4();
      const payload = {
        msisdn: phonenumber,
        nomineeName,
        amount,
        sessionid,
        username,
        mno: network.toUpperCase(),
        kuwaita: "malipo",
        refID: `DRM:${refID}:VOTE:${String(nominee).toUpperCase()}`,
      };

      makePaymentFunc(payload);

      return res.json(
        formatJsonResponse({
          mode: "END",
          userdata,
          other: `${position + 1},${serviceType.EVOTE.name},${nominee},${votePrice},${quantity}`,
          network,
          phonenumber,
          sessionid,
          username,
          trafficid,
        })
      );
    }
    default:
      return res.json(
        formatJsonResponse({
          mode: "END",
          userdata: "Session error. Please dial again.",
          other: "",
          network,
          phonenumber,
          sessionid,
          username,
          trafficid,
        })
      );
  }
};

const makePaymentFunc = (payload) => {
  axios
    .post("http://3.215.156.108:3000/payment/nsano", payload)
    .then((response) => {
      console.log("voter_2_version payment/nsano :>> ", response.data.status);
    })
    .catch((error) => {
      console.log("voter_2_version payment/nsano error :>> ", error);
    });
};

module.exports = router;
