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

/**
 * Same shape as wigal.js EventList: show_id, event_name, event_date, event_time, price
 * (id / name supported as aliases.)
 */
const TICKET_EVENTS = [
  {
    show_id: "72",
    event_name: "Play & Groove",
    event_date: "1st May",
    event_time: "8:00 PM",
    price: 70,
  }
];

const MAX_USSD_TICKET_OPTIONS = 9;
const MAX_TICKETS_PER_ORDER = 10;

const sanitizeUssdText = (s) => String(s == null ? "" : s).replace(/\^/g, " ");

const normalizeTicketEvent = (ev) => ({
  show_id: String(ev.show_id ?? ev.id ?? ""),
  event_name: sanitizeUssdText(ev.event_name ?? ev.name ?? "Event"),
  event_date: sanitizeUssdText(ev.event_date ?? ""),
  event_time: sanitizeUssdText(ev.event_time ?? ""),
  price: Number(ev.price),
});

const listedTicketEvents = () =>
  TICKET_EVENTS.slice(0, MAX_USSD_TICKET_OPTIONS).map(normalizeTicketEvent);

/**
 * Digit-only MoMo ref: always 1–6 digits (integer 1..999999 as string).
 * Uniqueness is statistical only; keep codes short for SMS/USSD limits.
 */
const generateUniqueNumericTicketCode = () =>
  String(random.int(1, 999999));

const buildTicketEventMenu = () => {
  const slice = listedTicketEvents();
  const lines = slice.map((ev, i) => {
    const datePart = ev.event_date ? ` - ${ev.event_date}` : "";
    return `${i + 1}.${ev.event_name} (GHS ${ev.price})${datePart}`;
  });
  let more = "";
  if (TICKET_EVENTS.length > MAX_USSD_TICKET_OPTIONS) {
    more = `^0.More on doomur.com`;
  }
  return `Select event^${lines.join("^")}^00.Back${more}`;
};

const ticketQuantityPrompt = (event) => {
  const datePart = event.event_date ? ` - ${event.event_date}` : "";
  return `${event.event_name} (GHS ${event.price})${datePart}^Enter quantity (1-${MAX_TICKETS_PER_ORDER})^00.Back`;
};

const ticketConfirmPrompt = (event, qty, lineTotal) =>
  `Paying GHS ${lineTotal} for ${qty} ticket(s) to ${event.event_name}^1.Proceed^00.Back`;

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
      let votingPrice = 2.0;
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
        refID: `DRM:${refID}:VOTE:${String(nominee).toUpperCase()}`,
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
  const listed = listedTicketEvents();

  switch (position) {
    case 1:
      if (TICKET_EVENTS.length === 0) {
        return res.send(
          formatResponseFunc({
            mode: "END",
            userdata: "No events at the moment",
            other: "",
            network,
            msisdn,
            sessionid,
            username,
            trafficid,
          })
        );
      }
      return res.send(
        formatResponseFunc({
          mode: "MORE",
          userdata: buildTicketEventMenu(),
          other: `2,${serviceType.ETICKET.name}`,
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
        })
      );
    case 2: {
      if (userdata === "00") {
        return res.send(
          formatResponseFunc({
            mode: "MORE",
            userdata: "Welcome to Doomur Services^1.Votes^2.Tickets",
            other: "1",
            network,
            msisdn,
            sessionid,
            username,
            trafficid,
          })
        );
      }
      const choice = parseInt(userdata, 10);
      if (isNaN(choice) || choice < 1 || choice > listed.length) {
        return res.send(
          formatResponseFunc({
            mode: "END",
            userdata: "Invalid selection. Please try again.",
            other: "",
            network,
            msisdn,
            sessionid,
            username,
            trafficid,
          })
        );
      }
      const event = listed[choice - 1];
      const ticketPrice =
        isNaN(event.price) || event.price <= 0 ? 1 : event.price;
      return res.send(
        formatResponseFunc({
          mode: "MORE",
          userdata: ticketQuantityPrompt(event),
          other: `3,${serviceType.ETICKET.name},${choice},${ticketPrice}`,
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
        })
      );
    }
    case 3: {
      const choice = parseInt(extraData.userInputs1, 10);
      const ticketPrice = parseFloat(extraData.userInputs2);
      const unit = isNaN(ticketPrice) || ticketPrice <= 0 ? 1 : ticketPrice;
      const event = listed[choice - 1];

      if (userdata === "00") {
        if (TICKET_EVENTS.length === 0) {
          return res.send(
            formatResponseFunc({
              mode: "END",
              userdata: "No events at the moment",
              other: "",
              network,
              msisdn,
              sessionid,
              username,
              trafficid,
            })
          );
        }
        return res.send(
          formatResponseFunc({
            mode: "MORE",
            userdata: buildTicketEventMenu(),
            other: `2,${serviceType.ETICKET.name}`,
            network,
            msisdn,
            sessionid,
            username,
            trafficid,
          })
        );
      }

      if (!event) {
        return res.send(
          formatResponseFunc({
            mode: "END",
            userdata: "Session expired. Please dial again.",
            other: "",
            network,
            msisdn,
            sessionid,
            username,
            trafficid,
          })
        );
      }

      const qtyRaw = userdata;
      const qty = parseInt(qtyRaw, 10);
      if (
        isNaN(qty) ||
        qty < 1 ||
        qty > MAX_TICKETS_PER_ORDER
      ) {
        return res.send(
          formatResponseFunc({
            mode: "MORE",
            userdata: `Quantity must be 1-${MAX_TICKETS_PER_ORDER}.^00.Back`,
            other: `3,${serviceType.ETICKET.name},${choice},${unit}`,
            network,
            msisdn,
            sessionid,
            username,
            trafficid,
          })
        );
      }

      const lineTotal = Math.round(qty * unit * 100) / 100;
      return res.send(
        formatResponseFunc({
          mode: "MORE",
          userdata: ticketConfirmPrompt(event, qty, lineTotal),
          other: `4,${serviceType.ETICKET.name},${choice},${qty}`,
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
        })
      );
    }
    case 4: {
      const choice = parseInt(extraData.userInputs1, 10);
      const qty = parseInt(extraData.userInputs2, 10);
      const event = listed[choice - 1];

      if (userdata === "00") {
        if (!event || isNaN(qty) || qty < 1) {
          return res.send(
            formatResponseFunc({
              mode: "MORE",
              userdata: buildTicketEventMenu(),
              other: `2,${serviceType.ETICKET.name}`,
              network,
              msisdn,
              sessionid,
              username,
              trafficid,
            })
          );
        }
        const unit =
          isNaN(event.price) || event.price <= 0 ? 1 : event.price;
        return res.send(
          formatResponseFunc({
            mode: "MORE",
            userdata: ticketQuantityPrompt(event),
            other: `3,${serviceType.ETICKET.name},${choice},${unit}`,
            network,
            msisdn,
            sessionid,
            username,
            trafficid,
          })
        );
      }

      if (userdata !== "1" || !event || isNaN(qty) || qty < 1) {
        return res.send(
          formatResponseFunc({
            mode: "END",
            userdata: "Invalid input. Please dial again.",
            other: "",
            network,
            msisdn,
            sessionid,
            username,
            trafficid,
          })
        );
      }

      const unit = isNaN(event.price) || event.price <= 0 ? 1 : event.price;
      const lineTotal = Math.round(qty * unit * 100) / 100;
      const ticketCode = generateUniqueNumericTicketCode();
      const ticketRefUuid = uuidv4();
      const payload = {
        msisdn,
        nomineeName: event.event_name,
        amount: String(lineTotal),
        sessionid,
        username,
        mno: network.toUpperCase(),
        kuwaita: "malipo",
        refID: `DRM:${ticketRefUuid}:TICKET:${ticketCode}`,
      };

      const bookPayload = {
        eventId: event.show_id,
        ticketCode,
        showName: event.event_name,
        itemPrice: String(unit),
        quantity: String(qty),
        showDate: event.event_date,
        showTime: event.event_time,
        msisdn,
      };

      makeTicketPaymentFunc(
        payload,
        bookPayload,
        network,
        msisdn,
        sessionid,
        username,
        trafficid,
        userdata
      );

      return res.send(
        formatResponseFunc({
          mode: "END",
          userdata: "Please wait for your payment prompt",
          other: `5,${serviceType.ETICKET.name},${event.show_id},${unit},${qty}`,
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

/** Ticket MoMo + book show (same pattern as wigal.js `/` ticket branch). */
const makeTicketPaymentFunc = (
  payload,
  bookPayload,
  network,
  msisdn,
  sessionid,
  username,
  trafficid,
  lastUserdata
) => {
  const logDate = new Date().toISOString().split("T")[0];
  const logTime = new Date().toLocaleTimeString();
  axios
    .post("http://3.215.156.108:3000/payment/nsano", payload)
    .then((response) => {
      const status = response.data && response.data.status;
      console.log("ticket payment/nsano CALLED :>> ", status);
      if (status) {
        axios
          .post("https://ussd.doomur.com/book", bookPayload)
          .then((bookRes) => {
            console.log("BOOKING CALLED :>> ", bookRes.data);
          })
          .catch((error) => {
            console.log("https://ussd.doomur.com/book error :>> ", error.message);
          });
      } else {
        sendSms(msisdn, "Failed to pay.");
      }
    })
    .catch((error) => {
      console.log("ticket payment/nsano error :>> ", error);
    });

  try {
    fs.appendFileSync(
      "finalUssdResponse.txt",
      `Network:${network}, phone no.:${msisdn}, Session:${sessionid}, Userdata:${lastUserdata}, Username:${username}, TrafficID:${trafficid}, Others:ticket,ref:${payload.refID}, {${logDate},${logTime}}\n`
    );
  } catch (e) {
    console.log("finalUssdResponse log error", e);
  }
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
