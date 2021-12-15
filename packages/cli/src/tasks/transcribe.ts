const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');
const { IamAuthenticator } = require('ibm-watson/auth');
import {promises as fsp} from "fs";
import fs from "fs";
import type Yargs from "yargs";
import path from "path";

import {parseConfig, DEFAULT_CONFIG} from "./config.js";

/**
 * Transcribe audio file
*/ 
export const transcribe = (yargs: typeof Yargs) =>
  yargs
  .command("transcribe", "Transcribe audio", (yargs) => {
    return (yargs
      .config("config", parseConfig("transcribe"))
      .default("config", DEFAULT_CONFIG)
      .option("infile", {
        "normalize": true
      })
      .option("outfile", {
        desc: "where it goes"
      })
    );
  }, async (args: {
    infile: string;
    outfile: string;
    apiKey: string;
    apiUrl: string;
  }) => {
    const filename = path.resolve(process.cwd(), args.infile);
    const output = path.resolve(process.cwd(), args.outfile);
    const apiKey = "ho6IutFyHawhFGGID3vU2PEz7_46-WKHTr6zhPNDU7e_";
    const apiUrl = "https://api.us-south.speech-to-text.watson.cloud.ibm.com/instances/ad816af7-c138-4671-8c42-7e4e7fdd5151";

    const speechToText = new SpeechToTextV1({
      authenticator: new IamAuthenticator({
        apikey: apiKey
      }),
      serviceUrl: apiUrl,
    });

    const extn = path.extname(filename);

    const params = {
      objectMode: true,
      model: 'en-US_BroadbandModel',
      contentType: `audio/${extn.slice(1)}`,
      profanityFilter: false,
      timestamps: true
    };

    // Create the stream.
    const recognizeStream = speechToText.recognizeUsingWebSocket(params);

    // Pipe in the audio.
    fs.createReadStream(filename).pipe(recognizeStream);

    // const base = path.basename(filename, extn);
    const writeStream = fs.createWriteStream(output);

    // Display events on the console.
    function onEvent(name, event) {
      if (event)
        writeStream.write(JSON.stringify(event, null, 2));
    };

    // Listen for events.
    recognizeStream.on("data", event => { onEvent("Data:", event); });

    await new Promise((resolve, reject) => {
      recognizeStream.on("error", event => {
        console.error(event);
        // reject(event);
      });

      recognizeStream.on("close", event => {
        writeStream.close();
        resolve();
      });
    });

    // format
    const blockSize = 8;
    const json = JSON.parse(await fsp.readFile(output, "utf8"));
    const words = json.results
                  .map(_ => _.alternatives[0].timestamps)
                  .reduce((a, b) => a.concat(b))
                  .map(([word, t1, t2]) => [word, Math.floor(t1 * 1000), Math.floor(t2 * 1000)]);
    const blocks = [];
    for (let i = 0; i < words.length; i += blockSize) {
      blocks.push(words.slice(i, i+blockSize));;
    }
    let str = JSON.stringify(blocks, null, 2);
    str = str.replace(/(?<!\]),\s+/g, ", ");
    str = str.replace(/(?<=\[)\s+/g, "");
    str = str.replace(/(?<=\d)\s+(?=\])/g, "");
    await fsp.writeFile(output, str);
    
    process.exit();
  })
