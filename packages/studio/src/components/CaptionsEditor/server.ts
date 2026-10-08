"use server";

import path from "node:path";

import type { ParameterValues, RichTranscript } from "@liqvid/schemas";
import {
  inlineTypeDeclaration,
  writeTypedJson,
} from "@liqvid/studio-plugin-api/server";
import { formatVttTimestamp } from "@liqvid/utils";
import chalk from "chalk";
import { Cause, Effect, Exit, FileSystem } from "effect";
import type { RelativeDir } from "effect-paths";

import { AUDIO_DIR, CAPTIONS_FILE, RICH_TRANSCRIPT } from "#_/conventions";
import { serverRuntime } from "#_/server-runtime";
import { getRoutesDir } from "#_/utils/misc";
import { getParameterizedAssetsDir } from "#_/utils/parameters";

import type { Transcript } from "./state.ts";

export async function saveCaptions({
  params,
  projectPath,
  transcript,
}: {
  params?: ParameterValues;
  projectPath: RelativeDir;
  transcript: RichTranscript;
}) {
  const audioDir = path.join(
    getParameterizedAssetsDir(getRoutesDir(), projectPath, params),
    AUDIO_DIR,
  );

  const exit = await serverRuntime.runPromiseExit(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      const vtt = generateVtt(transcript.captionBreaks, transcript.words);

      yield* Effect.all(
        [
          fs
            .writeFileString(path.join(audioDir, CAPTIONS_FILE), vtt)
            .pipe(Effect.tap(() => Effect.logDebug("saved captions"))),
          writeTypedJson({
            data: transcript,
            declaration: inlineTypeDeclaration(
              `import("@liqvid/schemas").RichTranscript`,
            ),
            dirname: audioDir,
            filename: RICH_TRANSCRIPT,
          }).pipe(Effect.tap(() => Effect.logDebug("saved rich transcript"))),
        ],
        { concurrency: "unbounded" },
      );
    }).pipe(Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause)))),
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
        ? transcript.at(-1)![2]
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
