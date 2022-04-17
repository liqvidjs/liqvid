import {readFile} from "fs/promises";
import * as path from "path";
import {fileURLToPath} from "url";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";

// shared options

import {audio} from "./tasks/audio.mjs";
import {build} from "./tasks/build.mjs";
import {serve} from "./tasks/serve.mjs";
import {render} from "./tasks/render.mjs";
import {thumbs} from "./tasks/thumbs.mjs";

// entry
export async function main() {
  let config = // WTF
    yargs(hideBin(process.argv))
    .scriptName("liqvid")
    .strict()
    .usage("$0 <cmd> [args]")
    .demandCommand(1, "Must specify a command");

  config = audio(config);
  config = build(config);
  config = serve(config);
  config = render(config);
  config = thumbs(config);

  // version
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const {version} = JSON.parse(await readFile(path.join(__dirname, "..", "package.json"), "utf8"));
  config.version(version);
  
  return config.help().argv;
}

import type {createServer} from "@liqvid/server";
import type {solidify, thumbs as captureThumbs} from "@liqvid/renderer";
import type {buildProject} from "./tasks/build.mjs";
import type {transcribe} from "@liqvid/captioning";

/**
 * Configuration object
 */
export interface LiqvidConfig {
  audio?: {
    transcribe: Partial<Parameters<typeof transcribe>[0]>;
  }
  build?: Partial<Parameters<typeof buildProject>[0]>;
  render?: Partial<Parameters<typeof solidify>[0]>;
  serve?: Partial<Parameters<typeof createServer>[0]>;
  thumbs?: Partial<Parameters<typeof captureThumbs>[0]>;
}
