import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import type { thumbs as captureThumbs, solidify } from "@liqvid/renderer";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import type { runNextBuild } from "./tasks/build.mts";
import { build } from "./tasks/build.mts";
import { generateImports } from "./tasks/generate-imports.mts";
import { publish } from "./tasks/publish.mts";
import { render } from "./tasks/render.mts";
import { thumbs } from "./tasks/thumbs.mts";

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
    .command(generateImports)
    .command(publish)
    .command(render)
    .command(thumbs)
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
