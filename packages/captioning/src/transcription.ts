import fs, {promises as fsp} from "fs";
import {IamAuthenticator} from "ibm-watson/auth";
import SpeechToTextV1 from "ibm-watson/speech-to-text/v1";
import path from "path";
import {toWebVTT} from "./webvtt";

/**
 * Transcript with per-word timings
 */
export type Transcript = [string, number, number][][];

/**
* Transcribe audio file
*/ 
export async function transcribe(args: {
  /** Path to audio file */
  input: string;
  
  /** Path for WebVTT captions */
  captions: string;

  /** Params to pass to IBM Watson. */
  params: Partial<Parameters<SpeechToTextV1["recognize"]>[0]>;
  
  /** Path for rich transcript */
  transcript: string;

  /** IBM Cloud API key */
  apiKey: string;

  /** IBM Watson endpoint URL */
  apiUrl: string;
}) {
  const filename = path.resolve(process.cwd(), args.input);
  const output = path.resolve(process.cwd(), args.transcript);
  
  const extn = path.extname(filename);
  
  // SpeechToText instance
  const speechToText = new SpeechToTextV1({
    authenticator: new IamAuthenticator({
      apikey: args.apiKey
    }),
    serviceUrl: args.apiUrl,
  });
  
  const params = Object.assign({
    audio: fs.createReadStream(filename),
    contentType: `audio/${extn.slice(1)}`,

    objectMode: true,
    model: "en-US_BroadbandModel",
    profanityFilter: false,
    smartFormatting: true,
    timestamps: true
  }, args.params);
  
  // transcribe
  const {result: json} = await speechToText.recognize(params);
  await fsp.writeFile(args.transcript, JSON.stringify(json, null, 2));
  
  // format
  const blockSize = 8;
  const words =
    json.results
    .map(_ => _.alternatives[0].timestamps)
    .reduce((a, b) => a.concat(b), [] as [string, number, number][])
    .map(([word, t1, t2]: [string, number, number]) => [word, Math.floor(t1 * 1000), Math.floor(t2 * 1000)] as [string, number, number]);

  const blocks: Transcript = [];

  for (let i = 0; i < words.length; i += blockSize) {
    blocks.push(words.slice(i, i+blockSize));;
  }

  // save new version
  let str = JSON.stringify(blocks, null, 2);
  str = str.replace(/(?<!\]),\s+/g, ", ");
  str = str.replace(/(?<=\[)\s+/g, "");
  str = str.replace(/(?<=\d)\s+(?=\])/g, "");
  await fsp.writeFile(output, str);

  // make webvtt
  const vtt = path.resolve(process.cwd(), args.captions);
  await fsp.writeFile(vtt, toWebVTT(blocks));
  
  process.exit(0);
}
