import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import type { thumbs as captureThumbs, solidify } from "@liqvid/renderer";
import { Effect } from "effect";
import { Command } from "effect/unstable/cli";
import { RelativeFile } from "effect-paths";

import type { runNextBuild } from "./tasks/build.mts";
import { build } from "./tasks/build.mts";
import { compress } from "./tasks/compress.mts";
import { debugCommand } from "./tasks/debug.mts";
import { generateImports } from "./tasks/generate-imports.mts";
import { publish } from "./tasks/publish.mts";
import { pull } from "./tasks/pull.mts";
import { render } from "./tasks/render.mts";
import { renderAudioCommand } from "./tasks/render-audio.mts";
import { screenshotCommand } from "./tasks/screenshot.mts";
import { thumbs } from "./tasks/thumbs.mts";
import { transcribeCommand } from "./tasks/transcribe.mts";
import { UP } from "./utils/effect.mts";

// version
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(
  await readFile(
    path.join(__dirname, UP, UP, RelativeFile("package.json")),
    "utf8",
  ),
);

const liqvid = Command.make("liqvid").pipe(
  Command.withDescription("Liqvid command line utility"),
  Command.withSubcommands([
    build,
    compress,
    debugCommand,
    generateImports,
    publish,
    pull,
    render,
    renderAudioCommand,
    screenshotCommand,
    thumbs,
    transcribeCommand,
  ]),
);

/** CLI entry point. */
export const main = Command.run(liqvid, { version }).pipe(
  Effect.provide(NodeServices.layer),
);

// entry
export function runMain() {
  NodeRuntime.runMain(main);
}

/**
 * Configuration object
 */
export interface LiqvidConfig {
  build?: Partial<Parameters<typeof runNextBuild>[0]>;
  render?: Partial<Parameters<typeof solidify>[0]>;
  thumbs?: Partial<Parameters<typeof captureThumbs>[0]>;
}
