<img src="./Eclypses.png" style="width:50%;margin-right:0;"/>

<div align="center" style="font-size:40pt; font-weight:900; font-family:arial; margin-top:300px;">
NodeJS WebSocket Tutorial</div>

<div align="center" style="font-size:15pt; font-family:arial; " >
Using MTE version 4.x.x</div>

# Introduction

This tutorial shows you how to implement the MTE into an existing WebSocket connection. This is only a sample, the MTE does NOT require the usage of WebSockets, you can use whatever communication protocol that is needed.

This tutorial demonstrates how to use MTE Core, MTE MKE and MTE Fixed Length. Depending on what your needs are, these three different implementations can be used in the same application OR you can use any one of them. They are not dependent on each other and can run simultaneously in the same application if needed.

The SDK that you received from Eclypses may not include the MKE or MTE FLEN add-ons. If your SDK contains either the MKE or the Fixed Length add-ons, the name of the SDK will contain "-MKE" or "-FLEN". If these add-ons are not there and you need them please work with your sales associate. If there is no need, please just ignore the MKE and FLEN options.

Here is a short explanation of when to use each, but it is encouraged to either speak to a sales associate or read the dev guide if you have additional concerns or questions.

**_MTE Core:_** This is the recommended version of the MTE to use. Unless payloads are large or sequencing is needed this is the recommended version of the MTE and the most secure.

**_MTE MKE:_** This version of the MTE is recommended when payloads are very large, the MTE Core would, depending on the token byte size, be multiple times larger than the original payload. Because this uses the MTE technology on encryption keys and encrypts the payload, the payload is only enlarged minimally.

**_MTE Fixed Length:_** This version of the MTE is very secure and is used when the resulting payload is desired to be the same size for every transmission. The Fixed Length add-on is mainly used when using the sequencing verifier with MTE. In order to skip dropped packets or handle asynchronous packets the sequencing verifier requires that all packets be a predictable size. If you do not wish to handle this with your application then the Fixed Length add-on is a great choice. This is ONLY an Encoder change - the Decoder that is used is the MTE Core Decoder.

In this tutorial we are creating an MTE Encoder and a MTE Decoder in the server as well as the client because we are sending messages in both directions. This is only needed when there are messages being sent from both sides. If only one side of your application is sending messages, then the side that sends the messages should have an MTE Encoder and the side receiving the messages needs only a MTE Decoder.

These steps should be followed on the server-side as well as on the client-side of the program.

**IMPORTANT:**

**NOTE:** _The solution provided in this tutorial does NOT include the MTE library or any supporting MTE library files. If you have NOT been provided a MTE library and supporting files, please contact Eclypses Inc. Solution will only work AFTER MTE library and any required MTE library files have been included._

**NOTE:** _This tutorial is provided in TypeScript. If you are not using TypeScript and instead using JavaScript, simply ignore the additional TypeScript syntax in the instructions. Use a `.js` extension instead of the `.ts` extensions mentioned. You will receive the same result._

# Tutorial Overview

The structure of this tutorial is as follows:

```bash
.
├── finish
│   ├── client
│   └── server
└── start
    ├── client
    └── server
```

| Directory | Description                                                               |
| --------- | ------------------------------------------------------------------------- |
| `finish`  | Example of project after completing the tutorial to reference             |
| `start`   | Project where you can follow along with the tutorial to implement the MTE |

_There is a Server and Client version of each project so that you can get it to talk to the same language. However, you can grab either the server or client and pair it with an Eclypses tutorial of a different language that uses the same WebSocket communication protocol. Both the server and client are implemented in almost identical ways, so this will be an agnostic tutorial that can be followed both on the client and the server._

# MTE Implementation

1. **Add MTE to your project**

   - Locate the TypeScript or JavaScript MTE compressed directory that was provided to you
   - Add the `Mte.ts` file into your project solution

2. **Import the following from `Mte.ts`**

   ```typescript
   import {
     MteDec, // Only if you are using MTE Core
     MteEnc, // Only if you are using MTE Core
     MteStatus,
     MteBase,
     MteWasm,
     MteMkeDec, // Only if you are using MKE
     MteMkeEnc, // Only if you are using MKE
     MteFlenEnc, // Only if you are using MTE FLEN
   } from "./Mte";
   ```

3. **Create the MTE Decoder and MTE Encoder as well as the accompanying MTE status and a variable to store the resulting string for each as global variables.**

   > If using the fixed length MTE (FLEN), all messages that are sent that are longer than the set fixed length will be trimmed by the MTE. The other side of the MTE will NOT contain the trimmed portion. Also messages that are shorter than the fixed length will be padded by the MTE so each message that is sent will ALWAYS be the same length. When shorter message are "decoded" on the other side the MTE takes off the extra padding when using strings and hands back the original shorter message, BUT if you use the raw interface the padding will be present as all zeros. Please see official MTE Documentation for more information.

```typescript
let decoderStatus = MteStatus.mte_status_success;
let encoderStatus = MteStatus.mte_status_success;
let decodedMessage: string | null;
let encodedMessage: Uint8Array | null;

//---------------------------------------------------
// Comment out to use MKE or MTE FLEN instead of MTE Core
//---------------------------------------------------
let decoder: MteDec;
let encoder: MteEnc;

//---------------------------------------------------
// Uncomment to use MKE instead of MTE Core
//---------------------------------------------------
// let decoder: MteMkeDec;
// let encoder: MteMkeEnc;

//---------------------------------------------------
// Uncomment to use MTE FLEN instead of MTE Core
//---------------------------------------------------
// const fixedLength = 8;
// let encoder: MteFlenEnc;
// let decoder: MteDec;
```

4. **Instantiate the `MteWasm` and `MteBase`.**

   - `MteWasm` should only be instantiated once in your application.
   - This method returns a promise, so make sure you `await` it in an async function.
   - `MteBase` gives us access to MTE helper methods.
     - You must pass an instantiated `MteWasm` into `MteBase`.

   ```typescript
   const wasm = new MteWasm();
   await wasm.instantiate();
   let base = new MteBase(wasm);
   ```

5. **Next, we need to be able to get the entropy, nonce, and identifier.**

   - These values should be treated like encryption keys and never exposed. For demonstration purposes in this tutorial we are simply allowing default values of 0 to be set. In a production environment these values should be protected and not available to outside sources. For the entropy, we have to determine the size of the allowed entropy value based on the drbg we have selected. A code sample below is included to demonstrate how to get these values.
   - We are adding 1 to the Decoder nonce so that the return value changes. This is optional, the same nonce can be used for the Encoder and Decoder. Client side values will be switched so they match up to the Encoder/Decoder and vice versa.

   ```typescript
   let encoderEntropy = "";
   let decoderEntropy = "";
   let encoderNonce = "0";
   let decoderNonce = "1";
   let identifier = "demo";
   ```

   - To set the entropy in the tutorial we are getting the minimum bytes required and creating a string of that length that contains all zeros.

   - You will need an instance of the Encoder or Decoder to get the correct entropy based on the DRBG that they are using with the helper method `getDrbg()`

     ```typescript
     const entropyMinBytes = base.getDrbgsEntropyMinBytes(encoder.getDrbg());
     entropy = entropyMinBytes > 0 ? "0".repeat(entropyMinBytes) : entropy;
     ```

6. **To ensure the MTE library is licensed correctly run the license check**

   - The `licenseCompanyName`, and `licenseKey` below should be replaced with your company’s MTE license information provided by Eclypses. If a trial version of the MTE is being used, any value can be passed into those fields for it to work.

   ```typescript
   const licenseCompany = "Eclypses";
   const licenseKey = "Eclypses123";

   if (!base.initLicense(licenseCompany, licenseKey)) {
     encoderStatus = MteStatus.mte_status_license_error;
     readlineSync.question(
       `License error (${base.getStatusName(
         encoderStatus
       )}): ${base.getStatusDescription(encoderStatus)}. Press any key to end.`
     );
     return;
   }
   ```

````



8. **Create MTE Decoder Instance and MTE Encoder Instances.**

   Here is a sample that creates the MTE Decoder.

   ```typescript
   //---------------------------------------------------
   // Comment out to use MKE instead of MTE Core
   //---------------------------------------------------
   decoder = MteDec.fromdefault(wasm);

   //---------------------------------------------------
   // Uncomment to use MKE instead of MTE Core
   //---------------------------------------------------
   // decoder = MteMkeDec.fromdefault(wasm);

   // Set mte values for the decoder
   decoder.setEntropyStr(decoderEntropy);
   decoder.setNonce(decoderNonce);

   // Initialize MTE decoder
   decoderStatus = decoder.instantiate(identifier);
   if (base.statusIsError(decoderStatus)) {
     throw new Error(
       `Failed to initialize the MTE Decoder engine. Status: ${base.getStatusName(
         decoderStatus,
       )} / ${base.getStatusDescription(decoderStatus)}`,
     );
   }
````

- (For further info on Decoder constructor – Check out the Developers Guide)\*

Here is a sample function that creates the MTE Encoder.

```typescript
//---------------------------------------------------
// Comment out to use MKE or MTE FLEN instead of MTE Core
//---------------------------------------------------
encoder = MteEnc.fromdefault(wasm);

//---------------------------------------------------
// Uncomment to use MKE instead of MTE Core
//---------------------------------------------------
// encoder = MteMkeEnc.fromdefault(wasm);

//---------------------------------------------------
// Uncomment to use MTE FLEN instead of MTE Core
//---------------------------------------------------
// encoder = MteFlenEnc.fromdefault(wasm, fixedLength);

// Set mte values for the encoder
encoder.setEntropyStr(encoderEntropy);
encoder.setNonce(encoderNonce);

// Initialize MTE encoder
encoderStatus = encoder.instantiate(identifier);
if (base.statusIsError(encoderStatus)) {
  throw new Error(
    `Failed to initialize the MTE Encoder engine. Status: ${base.getStatusName(
      encoderStatus
    )} / ${base.getStatusDescription(encoderStatus)}`
  );
}
```

- (For further info on Encoder constructor – Check out the Developers Guide)\*

9. **Finally, we need to add the MTE calls to encode and decode the messages that we are sending and receiving from the other side.**

   - Ensure on the server side the Encoder is called to encode the outgoing text, then the Decoder is called to decode the incoming response.

   Here is a sample of how to do this for the server side

   ```typescript
   // Decode incoming request
   ({ status: decoderStatus, str: decodedMessage } =
     decoder.decodeStr(byteArray));

   if (base.statusIsError(decoderStatus)) {
     console.log(
       `Error decoding: Status: ${base.getStatusName(
         decoderStatus
       )} / ${base.getStatusDescription(decoderStatus)}`
     );

     websocket.terminate();
   }

   // Encode outgoing response
   decodedMessage &&
     ({ status: encoderStatus, arr: encodedMessage } =
       encoder.encodeStr(decodedMessage));

   if (base.statusIsError(encoderStatus)) {
     console.log(
       `Error encoding: Status: ${base.getStatusName(
         encoderStatus
       )} / ${base.getStatusDescription(encoderStatus)}`
     );

     websocket.terminate();
   }
   ```

   Here is a sample of how to do this for the client side

   ```typescript
   // Encode outgoing message
   ({ status: encoderStatus, arr: encodedMessage } =
     encoder.encodeStr(textToSend));
   ```

if (base.statusIsError(encoderStatus)) {
console.log(
`Error encoding: Status: ${base.getStatusName( encoderStatus, )} / ${base.getStatusDescription(encoderStatus)}`,
);

websocket.terminate();
}

// Decode incoming response
({ status: decoderStatus, str: decodedMessage } =
decoder.decodeStr(byteArray));

if (base.statusIsError(decoderStatus)) {
console.log(
`Error encoding: Status: ${base.getStatusName( encoderStatus, )} / ${base.getStatusDescription(encoderStatus)}`,
);

websocket.terminate();
}

```







***The Server side and the Client side of the MTE Sockets Tutorial should now be ready for use on your device.***


<div style="page-break-after: always; break-after: page;"></div>

# Contact Eclypses

<img src="Eclypses.png" style="width:8in;"/>

<p align="center" style="font-weight: bold; font-size: 20pt;">Email: <a href="mailto:info@eclypses.com">info@eclypses.com</a></p>
<p align="center" style="font-weight: bold; font-size: 20pt;">Web: <a href="https://www.eclypses.com">www.eclypses.com</a></p>
<p align="center" style="font-weight: bold; font-size: 20pt;">Chat with us: <a href="https://developers.eclypses.com/dashboard">Developer Portal</a></p>
<p style="font-size: 8pt; margin-bottom: 0; margin: 300px 24px 30px 24px; " >

<b>All trademarks of Eclypses Inc.</b> may not be used without Eclypses Inc.'s prior written consent. No license for any use thereof has been granted without express written consent. Any unauthorized use thereof may violate copyright laws, trademark laws, privacy and publicity laws and communications regulations and statutes. The names, images and likeness of the Eclypses logo, along with all representations thereof, are valuable intellectual property assets of Eclypses, Inc. Accordingly, no party or parties, without the prior written consent of Eclypses, Inc., (which may be withheld in Eclypses' sole discretion), use or permit the use of any of the Eclypses trademarked names or logos of Eclypses, Inc. for any purpose other than as part of the address for the Premises, or use or permit the use of, for any purpose whatsoever, any image or rendering of, or any design based on, the exterior appearance or profile of the Eclypses trademarks and or logo(s).
</p>
```
