/*
THIS SOFTWARE MAY NOT BE USED FOR PRODUCTION. Otherwise,
The MIT License (MIT)

Copyright (c) Eclypses, Inc.

All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import express from 'express';
import { createServer } from 'http';
import { Server } from 'ws';
import readlineSync from 'readline-sync';

(async () => {
  //
  // This tutorial uses WebSockets for communication.
  // It should be noted that the MTE can be used with any type of communication. (WEBSOCKETS are not required!)
  //

  // Here is where you would want to gather settings for the MTE
  // Check MTE license and run DRBG self test
  let decodedMessage: string | null;
  let encodedMessage: Uint8Array | null;

  // Set default IP - but also prompt for IP in case user cannot use our default
  const ip = readlineSync.question(
    `Please enter IP to use, press ENTER for default IP localhost: `,
    { defaultInput: 'localhost' },
  );

  // Set default port - but also prompt for port in case user cannot use our default
  let port = 27015;

  let newPort = readlineSync.questionInt(
    `Please enter port to use, press ENTER for default port ${port}: `,
    { defaultInput: '27015' },
  );

  if (newPort) {
    while (!Number.isFinite(newPort)) {
      newPort = readlineSync.questionInt(
        `${newPort} is not a valid integer, please try again.`,
      );
    }

    port = newPort;
  }

  const uri = `ws://${ip}:${port}/`;

  // Create server, run server, and upgrade to a WebSocket server
  const app = express();
  const server = createServer(app);
  const websocketServer = new Server({ server });

  websocketServer.on('connection', (websocket) => {
    websocket.binaryType = 'arraybuffer';
    console.log('New client connected');

    websocket.on('message', (data: ArrayBuffer) => {
      const byteArray = new Uint8Array(data);

      // MTE Decoding the bytes would go here instead of using the Node TextDecoder to decode into a string
      decodedMessage = new TextDecoder().decode(byteArray);

      console.log(`\nDecoded data: ${decodedMessage}`);

      // MTE Encoding the text would go here instead of using the Node TextEncoder to encode to bytes
      encodedMessage = new TextEncoder().encode(decodedMessage);

      encodedMessage && websocket.send(encodedMessage, { binary: true });

      if (decodedMessage === 'quit') {
        websocket.terminate();
      }
    });

    websocket.on('close', () => {
      // Close server socket and prompt to end
      readlineSync.question(
        'Socket server is closed, press ENTER to end this...',
      );
      server.close();
      process.exit();
    });
  });

  server.listen(port, ip, () => {
    console.log(`Server is listening on ${uri}`);
  });
})().catch((error) => {
  throw new Error(error);
});
