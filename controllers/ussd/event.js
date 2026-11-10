const express = require("express");
const random = require("random");
const fs = require("fs");
const axios = require("axios");
const sendSms = require("../sms");
const { v4: uuidv4 } = require("uuid");
require("dotenv/config");

const router = express.Router();

const serviceType = {
  ETICKET: { index: 2, name: "ETICKET" },
};

const TICKET_EVENTS = [
  {
    show_id: "75",
    event_name: "Play & Groove",
    event_date: "5th Dec",
    event_time: "8:00 PM",
    price: 70,
  },
];

const MAX_USSD_TICKET_OPTIONS = 9;
const MAX_TICKETS_PER_ORDER = 10;

const sanitizeUssdText = (s) =>
  String(s == null ? "" : s).replace(/\^/g, " ");

const normalizeTicketEvent = (ev) => ({
  show_id: String(ev.show_id ?? ev.id ?? ""),
  event_name: sanitizeUssdText(ev.event_name ?? ev.name ?? "Event"),
  event_date: sanitizeUssdText(ev.event_date ?? ""),
  event_time: sanitizeUssdText(ev.event_time ?? ""),
  price: Number(ev.price),
});

const listedTicketEvents = () =>
  TICKET_EVENTS.slice(0, MAX_USSD_TICKET_OPTIONS).map(normalizeTicketEvent);

const generateUniqueNumericTicketCode = () => String(random.int(1, 999999));

const buildTicketEventMenu = () => {
  const slice = listedTicketEvents();
  const lines = slice.map((ev, i) => {
    const datePart = ev.event_date ? ` - ${ev.event_date}` : "";
    return `${i + 1}.${ev.event_name} (GHS ${ev.price})${datePart}`;
  });
  let more = "";
  if (TICKET_EVENTS.length > MAX_USSD_TICKET_OPTIONS) {
    more = "^0.More on doomur.com";
  }
  return `Doomur Events^Select event^${lines.join("^")}^00.Back${more}`;
};

const ticketQuantityPrompt = (event) => {
  const datePart = event.event_date ? ` - ${event.event_date}` : "";
  return `${event.event_name} (GHS ${event.price})${datePart}^Enter quantity (1-${MAX_TICKETS_PER_ORDER})^00.Back`;
};

const ticketConfirmPrompt = (event, qty, lineTotal) =>
  `Paying GHS ${lineTotal} for ${qty} ticket(s) to ${event.event_name}^1.Proceed^00.Back`;

const sendUssdResponse = (res, fields) => {
  const {
    mode,
    userdata,
    other,
    network,
    msisdn,
    sessionid,
    username,
    trafficid,
    phonenumber,
  } = fields;
  const phone = msisdn ?? phonenumber ?? "";
  const otherOut = other ?? "";
  if (res.locals.ussdFormat === "v2") {
    return res.json({
      network,
      sessionid,
      mode,
      phonenumber: phone,
      userdata,
      username,
      trafficid,
      other: otherOut,
    });
  }
  return res.send(
    `${network}|${mode}|${phone}|${sessionid}|${userdata}|${username}|${trafficid}|${otherOut}`
  );
};

const sessionFields = (network, msisdn, sessionid, username, trafficid) => ({
  network,
  msisdn,
  sessionid,
  username,
  trafficid,
});

const extractDataFunc = (other) => {
  try {
    const otherData = String(other || "").split(",");
    return {
      position: otherData[0],
      serviceType: otherData.length > 1 ? otherData[1] : "n/a",
      userInputs1: otherData.length > 2 ? otherData[2] : "",
      userInputs2: otherData.length > 3 ? otherData[3] : "",
      userInputs3: otherData.length > 4 ? otherData[4] : "",
      userInputs4: otherData.length > 5 ? otherData[5] : "",
    };
  } catch (error) {
    console.log("event extractDataFunc error :>> ", error);
    return {
      position: "2",
      serviceType: serviceType.ETICKET.name,
      userInputs1: "",
      userInputs2: "",
      userInputs3: "",
      userInputs4: "",
    };
  }
};

const eventMenuOrEnd = (res, session) => {
  if (TICKET_EVENTS.length === 0) {
    return sendUssdResponse(res, {
      mode: "END",
      userdata: "No events at the moment",
      other: "",
      ...session,
    });
  }
  return sendUssdResponse(res, {
    mode: "MORE",
    userdata: buildTicketEventMenu(),
    other: `2,${serviceType.ETICKET.name}`,
    ...session,
  });
};

const handleEventUssd = (body, res, ussdFormat) => {
  res.locals.ussdFormat = ussdFormat;

  let userdata = body.userdata;
  const network = body.network;
  const sessionid = body.sessionid;
  const mode = String(body.mode || "")
    .toUpperCase()
    .trim();
  const msisdn = body.msisdn ?? body.phonenumber;
  const username = body.username;
  const trafficid = body.trafficid;
  const other = body.other ?? "";
  const session = sessionFields(network, msisdn, sessionid, username, trafficid);

  console.log("event body :>> ", body);

  if (!mode) {
    if (ussdFormat === "v2") {
      return res.status(400).json({
        status: false,
        message: "Missing required field: mode",
      });
    }
    return sendUssdResponse(res, {
      mode: "END",
      userdata: "Invalid request.",
      other: "",
      ...session,
    });
  }

  try {
    if (mode === "START") {
      return eventMenuOrEnd(res, session);
    }
    if (mode === "MORE") {
      const extraData = extractDataFunc(other);
      return eTicketOnlyFlowFunc(
        userdata,
        parseInt(extraData.position, 10),
        extraData,
        session,
        res
      );
    }
    return sendUssdResponse(res, {
      mode: "END",
      userdata: "Invalid Input, Please try again",
      other: "",
      ...session,
    });
  } catch (error) {
    console.log("event catch error", error);
    return sendUssdResponse(res, {
      mode: "END",
      userdata: "Something went wrong, Please try again",
      other: "",
      ...session,
    });
  }
};

router.get("/health", (req, res) => {
  res.json({ status: true, message: "Doomur events USSD" });
});

router.get("/", (req, res) => handleEventUssd(req.query, res, "v1"));
router.post("/", (req, res) => handleEventUssd(req.body || {}, res, "v2"));

const eTicketOnlyFlowFunc = (userdata, position, extraData, session, res) => {
  const listed = listedTicketEvents();
  const { network, msisdn, sessionid, username, trafficid } = session;

  switch (position) {
    case 2: {
      if (userdata === "00") {
        return sendUssdResponse(res, {
          mode: "END",
          userdata: "Thank you. Goodbye.",
          other: "",
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
        });
      }
      const choice = parseInt(userdata, 10);
      if (isNaN(choice) || choice < 1 || choice > listed.length) {
        return sendUssdResponse(res, {
          mode: "END",
          userdata: "Invalid selection. Please try again.",
          other: "",
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
        });
      }
      const event = listed[choice - 1];
      const ticketPrice =
        isNaN(event.price) || event.price <= 0 ? 1 : event.price;
      return sendUssdResponse(res, {
        mode: "MORE",
        userdata: ticketQuantityPrompt(event),
        other: `3,${serviceType.ETICKET.name},${choice},${ticketPrice}`,
        network,
        msisdn,
        sessionid,
        username,
        trafficid,
      });
    }
    case 3: {
      const choice = parseInt(extraData.userInputs1, 10);
      const ticketPrice = parseFloat(extraData.userInputs2);
      const unit = isNaN(ticketPrice) || ticketPrice <= 0 ? 1 : ticketPrice;
      const event = listed[choice - 1];

      if (userdata === "00") {
        return eventMenuOrEnd(res, session);
      }

      if (!event) {
        return sendUssdResponse(res, {
          mode: "END",
          userdata: "Session expired. Please dial again.",
          other: "",
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
        });
      }

      const qty = parseInt(userdata, 10);
      if (isNaN(qty) || qty < 1 || qty > MAX_TICKETS_PER_ORDER) {
        return sendUssdResponse(res, {
          mode: "MORE",
          userdata: `Quantity must be 1-${MAX_TICKETS_PER_ORDER}.^00.Back`,
          other: `3,${serviceType.ETICKET.name},${choice},${unit}`,
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
        });
      }

      const lineTotal = Math.round(qty * unit * 100) / 100;
      return sendUssdResponse(res, {
        mode: "MORE",
        userdata: ticketConfirmPrompt(event, qty, lineTotal),
        other: `4,${serviceType.ETICKET.name},${choice},${qty}`,
        network,
        msisdn,
        sessionid,
        username,
        trafficid,
      });
    }
    case 4: {
      const choice = parseInt(extraData.userInputs1, 10);
      const qty = parseInt(extraData.userInputs2, 10);
      const event = listed[choice - 1];

      if (userdata === "00") {
        if (!event || isNaN(qty) || qty < 1) {
          return eventMenuOrEnd(res, session);
        }
        const unit =
          isNaN(event.price) || event.price <= 0 ? 1 : event.price;
        return sendUssdResponse(res, {
          mode: "MORE",
          userdata: ticketQuantityPrompt(event),
          other: `3,${serviceType.ETICKET.name},${choice},${unit}`,
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
        });
      }

      if (userdata !== "1" || !event || isNaN(qty) || qty < 1) {
        return sendUssdResponse(res, {
          mode: "END",
          userdata: "Invalid input. Please dial again.",
          other: "",
          network,
          msisdn,
          sessionid,
          username,
          trafficid,
        });
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

      return sendUssdResponse(res, {
        mode: "END",
        userdata: "Please wait for your payment prompt",
        other: `5,${serviceType.ETICKET.name},${event.show_id},${unit},${qty}`,
        network,
        msisdn,
        sessionid,
        username,
        trafficid,
      });
    }
    default:
      return eventMenuOrEnd(res, session);
  }
};

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
      console.log("event ticket payment/nsano :>> ", status);
      if (status) {
        axios
          .post("https://ussd.doomur.com/book", bookPayload)
          .then((bookRes) => {
            console.log("event BOOKING :>> ", bookRes.data);
          })
          .catch((error) => {
            console.log("event book error :>> ", error.message);
          });
      } else {
        sendSms(msisdn, "Failed to pay.");
      }
    })
    .catch((error) => {
      console.log("event payment/nsano error :>> ", error);
    });

  try {
    fs.appendFileSync(
      "finalUssdResponse.txt",
      `Network:${network}, phone no.:${msisdn}, Session:${sessionid}, Userdata:${lastUserdata}, Username:${username}, TrafficID:${trafficid}, Others:event-ticket,ref:${payload.refID}, {${logDate},${logTime}}\n`
    );
  } catch (e) {
    console.log("finalUssdResponse log error", e);
  }
};

module.exports = router;
