import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import type { thumbs as captureThumbs, solidify } from "@liqvid/renderer";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import type { runNextBuild } from "./tasks/build.mts";
import { build } from "./tasks/build.mts";
import { compress } from "./tasks/compress.mts";
import { debugCommand } from "./tasks/debug.mts";
import { generateImports } from "./tasks/generate-imports.mts";
import { publish } from "./tasks/publish.mts";
import { pull } from "./tasks/pull.mts";
import { render } from "./tasks/render.mts";
import { renderAudioCommand } from "./tasks/render-audio.mts";
import { thumbs } from "./tasks/thumbs.mts";
import { transcribeCommand } from "./tasks/transcribe.mts";

// entry
export async function main() {
  // version
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const { version } = JSON.parse(
    await readFile(path.join(__dirname, "..", "..", "package.json"), "utf8"),
  );

  return yargs(hideBin(process.argv))
    .scriptName("liqvid")
    .strict()
    .usage("$0 <cmd> [args]")
    .demandCommand(1, "Must specify a command")
    .command(build)
    .command(compress)
    .command(debugCommand)
    .command(generateImports)
    .command(publish)
    .command(pull)
    .command(render)
    .command(renderAudioCommand)
    .command(thumbs)
    .command(transcribeCommand)
    .version(version)
    .help()
    .parseAsync();
}

/**
 * Configuration object
 */
export interface LiqvidConfig {
  build?: Partial<Parameters<typeof runNextBuild>[0]>;
  render?: Partial<Parameters<typeof solidify>[0]>;
  thumbs?: Partial<Parameters<typeof captureThumbs>[0]>;
}
