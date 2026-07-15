"use server";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeFileSystem } from "@effect/platform-node";
import { formatVttTimestamp } from "@liqvid/utils";
import chalk from "chalk";
import { Effect, Exit, FileSystem } from "effect";
import { StatusCodes } from "http-status-codes";

import { getServerState } from "../../initialize.mts";

import type { Transcript } from "./state.ts";

export async function saveCaptions({
  captionBreaks,
  projectPath: pageTsxPath,
  transcript,
}: {
  captionBreaks: number[];
  projectPath: string;
  transcript: Transcript;
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

      let file = "WEBVTT\n\n";

      for (let i = 0; i <= captionBreaks.length; i++) {
        const startIndex = i === 0 ? 0 : captionBreaks[i - 1]! + 1;
        const endIndex =
          i === captionBreaks.length
            ? transcript.length - 1
            : captionBreaks[i]!;

        const end =
          i === captionBreaks.length
            ? transcript[transcript.length - 1]![2]
            : transcript[captionBreaks[i]! + 1]![1];

        file += `${formatVttTimestamp(transcript[startIndex]![1])} --> ${formatVttTimestamp(end)}\n`;
        file +=
          transcript
            .slice(startIndex, endIndex + 1)
            .map(([text]) => text)
            .join(" ") + "\n\n";
      }

      const dest = path.join(projectPath, ".liqvid", "audio", "captions.vtt");

      yield* fs.writeFileString(dest, file);
    }).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.tapCause(Effect.logError),
    ),
  );

  if (Exit.isFailure(exit)) {
    console.error(chalk.red("Failed to save captions", exit.cause));

    throw new Error("Failed to save captions");
  }
}
