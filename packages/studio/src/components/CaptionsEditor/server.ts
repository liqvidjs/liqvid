"use server";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeFileSystem } from "@effect/platform-node";
import { writeJSON } from "@liqvid/cli/utils";
import type { RichTranscript } from "@liqvid/schemas/effect";
import { formatVttTimestamp, wait } from "@liqvid/utils";
import chalk from "chalk";
import { Cause, Effect, Exit, FileSystem } from "effect";
import { StatusCodes } from "http-status-codes";

import {
  ASSETS_DIR,
  AUDIO_DIR,
  CAPTIONS_FILE,
  RICH_TRANSCRIPT,
} from "../../conventions.mts";
import { getServerState } from "../../initialize.mts";

import type { Transcript } from "./state.ts";

export async function saveCaptions({
  projectPath: pageTsxPath,
  transcript,
}: {
  projectPath: string;
  transcript: RichTranscript;
}) {
  const { cwd } = getServerState();
  const projectPath = path.dirname(fileURLToPath(pageTsxPath));

  if (!projectPath.startsWith(cwd)) {
    return Response.json(
      { error: "Invalid project path" },
      { status: StatusCodes.FORBIDDEN },
    );
  }

  const exit = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      const vtt = generateVtt(transcript.captionBreaks, transcript.words);

      yield* Effect.all(
        [
          fs
            .writeFileString(
              path.join(projectPath, ASSETS_DIR, AUDIO_DIR, CAPTIONS_FILE),
              vtt,
            )
            .pipe(Effect.tap(() => Effect.logDebug("saved captions"))),
          writeJSON(
            path.join(projectPath, ASSETS_DIR, AUDIO_DIR, RICH_TRANSCRIPT),
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
