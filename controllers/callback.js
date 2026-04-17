const express = require('express')
const router = express.Router();
const fs = require('fs');
const axios = require('axios');

const sendSms = require('./sms');

const Showdb = require('../models/showdb')
let DB = new Showdb();

/**
 * author_ref from payment (aligned with controllers/vote.js):
 * - Vote (current): DRM:<uuid>:VOTE:<nomineeCode>
 * - Vote (legacy): DRM:<uuid>:<nomineeCode> (3 segments only)
 * - Ticket (current): DRM:<uuid>:TICKET:<ticketCode> (ticketCode 1–6 digits)
 * - Ticket: digit-only refID (gateway echo), 1–6 digits
 * - Ticket: DRM:<1–6 digit ticketCode> two segments only
 */
const parsePaymentAuthorRef = (authorRef) => {
  if (!authorRef || typeof authorRef !== 'string') {
    return { kind: 'unknown' };
  }
  const s = authorRef.trim();
  if (/^\d{1,6}$/.test(s)) {
    return { kind: 'ticket', eventId: '', ticketCode: s, authorRef: s };
  }
  const parts = s.split(':');
  if (parts[0] !== 'DRM') {
    return { kind: 'unknown', authorRef: s };
  }
  if (
    parts.length === 2 &&
    parts[1] &&
    /^\d{1,6}$/.test(parts[1])
  ) {
    return {
      kind: 'ticket',
      eventId: '',
      ticketCode: parts[1],
      authorRef: s,
    };
  }
  if (parts.length >= 4 && parts[2] === 'TICKET') {
    const stub = parts.slice(3).join(':');
    return {
      kind: 'ticket',
      eventId: stub,
      ticketCode: stub,
      authorRef: s,
    };
  }
  if (parts.length >= 4 && parts[2] === 'VOTE') {
    return {
      kind: 'vote',
      nomineeCode: parts.slice(3).join(':'),
      authorRef: s,
    };
  }
  if (parts.length >= 3) {
    return {
      kind: 'vote',
      nomineeCode: parts.slice(2).join(':'),
      authorRef: s,
    };
  }
  return { kind: 'unknown', authorRef: s };
};

const normalizeAuthorRef = (body) => {
  if (body.author_ref) {
    return String(body.author_ref).trim();
  }
  if (body.authorRefID) {
    return String(body.authorRefID).replace(/^DMR/i, '').trim();
  }
  return '';
};

const buildCallbackOtherField = (body) =>
  `${body.msg}, ${body.date} ${body.authorRefID}, ${body.network}, ${body.reference}, ${body.metadataID}`;

const sendTicketPaymentSms = (phone, ticketCode, amount, transactionID, parsed) => {
  const refLine =
    parsed.eventId && String(parsed.eventId) !== String(ticketCode)
      ? `Event ref: ${parsed.eventId}\n`
      : '';
  const message = `Your ticket code for Play & Groove is ${ticketCode}.\n${refLine}Amount paid: GHS ${amount}\nTransaction ID: ${transactionID}\n\nThank you for choosing Doomur!\nVisit https://doomur.com for more.`;
  sendSms(phone, message);
};

/** Ticket path: payments DB + SMS (matches vote.js numeric / legacy DRM:TICKET refs). */
const processTicketPaymentSuccess = (body, parsed, authorRef) => {
  const ticketCode = parsed.ticketCode || authorRef || parsed.authorRef;
  const transactionID = body.transactionID;
  const amount = body.amount;
  const phone = body.userID;
  const other = buildCallbackOtherField(body);

  DB.add_payment(
    ticketCode,
    transactionID,
    amount,
    other,
    phone,
    (response) => {
      fs.appendFileSync(
        'BookingSuccessError.txt',
        JSON.stringify(response, body, date, time)
      );
      if (response.status) {
        sendTicketPaymentSms(phone, ticketCode, amount, transactionID, parsed);
      }
    }
  );
};

/** Vote path: nominee lookup + evotes API + SMS */
const processVotePaymentSuccess = (body, parsed) => {
  const nomineeCode = (parsed.nomineeCode || 'n/a').toUpperCase();
  console.log('callback vote nomineeCode :>> ', nomineeCode);
  const transactionID = body.transactionID;
  const amount = body.amount;
  const phone = body.userID;

  axios
    .get(
      `https://api-service.doomur.com/evotes/nominees/code/${nomineeCode}`
    )
    .then((response) => {
      const data = response.data && response.data.data;
      if (!data || !data.category) {
        console.log('callback: nominee not found', nomineeCode);
        return;
      }
      const nomineeName = data.name;
      const nCode = data.nomineeCode;
      const category = data.category.name;

      const payloadBook = {
        nomineeCode: nCode,
        voteQuantity: 1,
        amount: amount,
        voterId: phone,
        meta: {
          ...body,
          location: '',
          device: 'ussd',
          campaign: 'evote',
        },
      };

      axios
        .post('https://api-service.doomur.com/evotes/vote', payloadBook)
        .then(() => {
          const message = `Thank you for voting for ${nomineeName} in the ${category} category.\nPayment received: GHS ${amount}\nTransaction ID: ${transactionID}\nOrganised by High School TV WTB Season 9.\n\nPowered by Doomur - your platform for Evotes and Tickets.\nVisit https://doomur.com to learn more.`;
          sendSms(phone, message);
        })
        .catch((error) => {
          console.log('callback vote POST error :>> ', error.message);
          fs.appendFileSync(
            'sendingVote.txt',
            JSON.stringify({
              url: 'https://api-service.doomur.com/evotes/vote',
              request: 'axios POST',
              error: String(error),
            })
          );
          fs.appendFileSync(
            'ValidVotesButNotInDB.txt',
            JSON.stringify(body)
          );
        });
    })
    .catch((error) => {
      console.log('callback nominee GET error :>> ', error.message);
    });
};

const oldDate = new Date()
var date = oldDate.toISOString().split('T')[0];
var time  = new Date().toLocaleTimeString();  



/**
 * Unified Nsano (or compatible) callback: records vote via API on success,
 * or records ticket payment via DB + SMS. Configure webhook URL to POST here.
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    fs.appendFileSync(
      'TicketVoterCallback.txt',
      JSON.stringify(body, date, time)
    );

    const code = body.code;
    if (code !== '00' && code !== 0) {
      return res.status(200).json({ code: body.code, msg: body.msg });
    }

    const authorRef = normalizeAuthorRef(body);
    const parsed = parsePaymentAuthorRef(authorRef);

    fs.appendFileSync('VoterMain.txt', JSON.stringify(body));

    if (parsed.kind === 'ticket') {
      processTicketPaymentSuccess(body, parsed, authorRef);
      return res.status(200).json({ code: body.code, msg: body.msg });
    }

    if (parsed.kind === 'vote') {
      processVotePaymentSuccess(body, parsed);
      return res.status(200).json({ code: body.code, msg: body.msg });
    }

    fs.appendFileSync(
      'TicketVoterUnknownRef.txt',
      JSON.stringify({ authorRef, parsed, body }, date, time)
    );
    return res.status(200).json({ code: body.code, msg: body.msg });
  } catch (error) {
    console.log('ticket-voter-callback error :>> ', error);
    return res.status(200).json({});
  }
});


// CALLBACK FOR EVOTE ONLY
router.post('/evote-only-callback', async (req, res) => {
  try {
    const body = req.body;
    fs.appendFileSync('NsanoCallback.txt', JSON.stringify(body, date, time));
    const code = body.code;

    if (code == '00') {
      fs.appendFileSync('VoterMain.txt', JSON.stringify(body));
      const authorRef = normalizeAuthorRef(body);
      const parsed = parsePaymentAuthorRef(authorRef);

      if (parsed.kind === 'ticket') {
        processTicketPaymentSuccess(body, parsed, authorRef);
      } else if (parsed.kind === 'vote') {
        processVotePaymentSuccess(body, parsed);
      } else {
        fs.appendFileSync(
          'CallbackUnknownRef.txt',
          JSON.stringify({ authorRef, parsed, body }, date, time)
        );
      }
    }

    return res.status(200).json({
      code: body.code,
      msg: body.msg,
    });
  } catch (error) {
    console.log('error :>> ', error);
    return res.status(404).json({});
  }
});

//CALLBACK FOR TICKETS ONLY
router.post('/ticket-only-callback', (req, res) => {
    let body = req.body;
    fs.appendFileSync('NsanoCallback.txt', JSON.stringify(body, date,time))
    let code = body.code;
    let ticketCode = body.author_ref;
    let transactionID = body.transactionID
    let amount = body.amount;
    let phone = body.userID;
    let other = `${body.msg}, ${body.date} ${body.authorRefID}, ${body.network}, ${body.reference}, ${body.metadataID}`
    if (code == "00") {
        // -----------------------INTERNAL CODE---------------------------------
        let checkIfItsVotes = ticketCode.includes('VOTE')
         fs.appendFileSync('VoterMain.txt', JSON.stringify(body))
        if(checkIfItsVotes){
                fs.appendFileSync('Voter.txt', JSON.stringify(body))
             // update vote isSuccess column
                axios.patch(`https://evoting.doomur.com/api/nominations/update-vote/${ticketCode}`)
                    .then((response) => {
                        console.log('VOTING CALLED :>> ', response.data);
                        return;
                    }).catch((error) => {
                    console.log('https://evoting.doomur.com/api error :>> ', error);
                    return;
                }) 
        }
        else{
            // -----------------------INTERNAL CODE---------------------------------
            // TODO: update bookings as paid and adds to payment db
            DB.add_payment(ticketCode, transactionID, amount, other, phone, (response) => {
                fs.appendFileSync('BookingSuccessError.txt', JSON.stringify(response, body, date, time))
                if (response.status) { 
    
                    var message= `Your Ticket Code for Play n Grove is ${ticketCode}.\nAmount paid: GHS ${amount}\nTransactionId: ${transactionID}
                    \n\nThank you for choosing Doomur! 
                    \nVisit https://doomur.com for more.`;
                    sendSms(phone,message);  
                }
            })
        }
    } else {
        //Todo: make another request to notification request
    }
    return res.status(200).json({
        code: body.code,
        msg: body.msg
    })
})

module.exports = router;