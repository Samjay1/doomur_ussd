// Hmac.digest() Demo Example

// Importing the crypto module
const crypto = require("crypto")

// Initializing the Hmac object with encoding and key
const hmac = crypto.createHmac('sha256', 'secretKey');

// Defining the hmac encoding algorithm
var encoding = "sha256"

// Defining the secret key
var secretKey = "6/gNeaBdvURQvU3hKQQ+BOJ7Lz/1/G4zJGToZv0lTtthpQm3yXR3V/zfgPTVjSfKxyxtbzfd/jEpaLo3H557KA=="

// Defining the data to be hashed
var data = {
    "amount": "10.00",
    "callback_url": "https://ussd.doomur.com/payment",
    "customer_number": "233547785025",
    "exttrid": "4243846303",
    "nw": "MTN",
    "reference": "Test payment",
    "service_id": "2446",
    "trans_type": "ATP",
    "ts": "2023-07-11 07:21:43"
}
let newdata = JSON.stringify(data)
// Creating the Hmac in hex encoding
let hmacDigest = crypto.createHmac(encoding, secretKey).update(newdata).digest("hex")

// Creating the Hmac in base64 encoding
let hmacDigestWithBase64 = crypto.createHmac(encoding, secretKey).update(newdata).digest("base64")

// Printing the Hmac value using digests
console.log("Hmac in Hex is: " + hmacDigest)
console.log("Hmac in Base64 encoding: " + hmacDigestWithBase64)