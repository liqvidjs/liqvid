import yargs from "yargs";

// shared options

import {audio} from "./tasks/audio.js";
import {build} from "./tasks/build.js";
import {serve} from "./tasks/serve.js";
import {render} from "./tasks/render.js";
import {thumbs} from "./tasks/thumbs.js";

// entry
export async function main() {
  let config = // WTF
    yargs
    .scriptName("liqvid")
    .strict()
    .usage("$0 <cmd> [args]")
    .demandCommand(1, 'Must specify a command');

  config = audio(config);
  config = build(config);
  config = serve(config);
  config = render(config);
  config = thumbs(config);
  
  return config.help().argv;
}

import type {createServer} from "@liqvid/server";
import type {solidify, thumbs as captureThumbs} from "@liqvid/renderer";
import type {buildProject} from "./tasks/build";
import type {transcribe} from "@liqvid/captioning";

/**
 * Configuration object
 */
export interface LiqvidConfig {
  audio: {
    transcribe: Partial<Parameters<typeof transcribe>[0]>;
  }
  build: Partial<Parameters<typeof buildProject>[0]>;
  render: Partial<Parameters<typeof solidify>[0]>;
  serve: Partial<Parameters<typeof createServer>[0]>;
  thumbs: Partial<Parameters<typeof captureThumbs>[0]>;
}
