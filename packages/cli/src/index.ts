import yargs from "yargs";

// shared options

import {build} from "./tasks/build.js";
import {serve} from "./tasks/serve.js";
import {transcribe} from "./tasks/transcribe.js";
import {webvtt} from "./tasks/webvtt.js";

// entry
export async function main() {
  let config = // WTF
    yargs
    .scriptName("liqvid")
    .usage("$0 <cmd> [args]");

  config = build(config);
  config = serve(config);
  config = transcribe(config);
  config = webvtt(config);

  return config.help().argv;
}
