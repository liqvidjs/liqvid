"use server";

import path from "node:path";

import { NodeFileSystem } from "@effect/platform-node";
import { writeJSON } from "@liqvid/cli/utils";
import type { RichTranscript } from "@liqvid/schemas";
import { formatVttTimestamp } from "@liqvid/utils";
import chalk from "chalk";
import { Cause, Effect, Exit, FileSystem } from "effect";
import type { RelativeDir } from "effect-paths";

import {
  ASSETS_DIR,
  AUDIO_DIR,
  CAPTIONS_FILE,
  NEXT_APP_DIR,
  RICH_TRANSCRIPT,
} from "../../conventions.mts";
import { getServerState } from "../../initialize.mts";

import type { Transcript } from "./state.ts";

export async function saveCaptions({
  projectPath,
  transcript,
}: {
  projectPath: RelativeDir;
  transcript: RichTranscript;
}) {
  const { cwd } = getServerState();
  const projectDir = path.join(cwd, NEXT_APP_DIR, projectPath);

  const exit = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      const vtt = generateVtt(transcript.captionBreaks, transcript.words);

      yield* Effect.all(
        [
          fs
            .writeFileString(
              path.join(projectDir, ASSETS_DIR, AUDIO_DIR, CAPTIONS_FILE),
              vtt,
            )
            .pipe(Effect.tap(() => Effect.logDebug("saved captions"))),
          writeJSON(
            path.join(projectDir, ASSETS_DIR, AUDIO_DIR, RICH_TRANSCRIPT),
            transcript,
          ).pipe(Effect.tap(() => Effect.logDebug("saved rich transcript"))),
        ],
        { concurrency: "unbounded" },
      );
    }).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
    ),
  );

  if (Exit.isFailure(exit)) {
    console.error(chalk.red("Failed to save captions", exit.cause));

    throw new Error("Failed to save captions");
  }
}

/** Generate the WebVTT file content from the transcript and caption breaks. */
function generateVtt(captionBreaks: readonly number[], transcript: Transcript) {
  let file = "WEBVTT\n\n";

  for (let i = 0; i <= captionBreaks.length; i++) {
    const startIndex = i === 0 ? 0 : captionBreaks[i - 1]! + 1;
    const endIndex =
      i === captionBreaks.length ? transcript.length - 1 : captionBreaks[i]!;

    const end =
      i === captionBreaks.length
        ? transcript[transcript.length - 1]![2]
        : transcript[captionBreaks[i]! + 1]![1];

    file +=
      formatVttTimestamp(transcript[startIndex]![1]) +
      " --> " +
      formatVttTimestamp(end) +
      "\n";

    file +=
      transcript
        .slice(startIndex, endIndex + 1)
        .map(([text]) => text)
        .join(" ") + "\n\n";
  }

  return file;
}
