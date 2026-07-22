import * as path from "node:path";

import { generateThumbs as generateThumbsApi } from "@liqvid/cli/thumbs";
import { loadJson, writeJSON } from "@liqvid/cli/utils";
import {
  type ThumbnailOptions,
  ThumbnailsJob,
  type ThumbnailsJobIn,
} from "@liqvid/schemas";
import { Effect, FileSystem, Option } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { type AbsoluteDir, RelativeDir, RelativeFile } from "effect-paths";

import {
  ASSETS_DIR,
  DARK_DIR,
  LIGHT_DIR,
  NEXT_APP_DIR,
  THUMBS_DIR,
} from "../conventions.mts";
import { getServerState } from "../initialize.mts";
import { NotFoundError } from "../utils/errors.mts";
import { createJob } from "../utils/jobs.mts";
import { inRoutesDir } from "../utils/misc.mts";

import { WebApi } from "./contract.mts";

const THUMBS_BASE_DIR = path.join(ASSETS_DIR, THUMBS_DIR);
const THUMBS_JOB_FILE = RelativeFile("thumbnails-job.json");

interface GenerateThumbsBody {
  colorScheme?: "light" | "dark" | "both";
  cols?: number;
  frequency?: number;
  height?: number;
  imageFormat?: "jpeg" | "png";
  quality?: number;
  rows?: number;
  width?: number;
}

/**
 * Read thumbnail sheets from a directory.
 */
function readThumbSheets(dir: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const files = yield* fs.readDirectory(dir);

    return files
      .filter((f) => /^\d+\.(jpeg|png)$/.test(f))
      .sort((a, b) => {
        const numA = Number.parseInt(a, 10);
        const numB = Number.parseInt(b, 10);
        return numA - numB;
      });
  });
}

/**
 * Generate thumbnails for a single color scheme.
 */
function generateForScheme(
  url: string,
  outputDir: AbsoluteDir,
  colorScheme: "light" | "dark",
  body: GenerateThumbsBody,
  projectPath: RelativeDir,
) {
  return Effect.gen(function* () {
    const { config: $config } = getServerState();
    const fs = yield* FileSystem.FileSystem;

    const defaults = $config.pipe(
      Option.flatMapNullishOr((config) => config.media?.thumbnails?.defaults),
      Option.getOrElse(() => ({}) as Partial<ThumbnailOptions>),
    );

    const imageFormat = body.imageFormat ?? defaults?.imageFormat ?? "jpeg";
    const outputPattern = path.join(
      outputDir,
      RelativeFile(`%s.${imageFormat}`),
    );

    // Ensure output directory exists
    yield* fs.makeDirectory(outputDir, { recursive: true });

    yield* createJob(
      "thumbnails",
      generateThumbsApi({
        ...defaults,
        ...body,
        colorScheme,
        imageFormat,
        output: outputPattern,
        url,
      }),
      { path: projectPath },
    );

    return yield* readThumbSheets(outputDir);
  });
}

/**
 * Read the thumbnail job configuration from a project.
 */
function readThumbsJob(thumbsBaseDir: AbsoluteDir) {
  const jobFilePath = path.join(thumbsBaseDir, THUMBS_JOB_FILE);
  return loadJson(ThumbnailsJob, jobFilePath);
}

export const thumbsLive = HttpApiBuilder.group(WebApi, "thumbs", (handlers) =>
  // list thumbnails for project
  handlers
    .handle("list", ({ query: { projectPath } }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        const { cwd } = getServerState();
        // read directories
        const thumbsBaseDir = path.join(
          cwd,
          NEXT_APP_DIR,
          projectPath,
          ASSETS_DIR,
          THUMBS_DIR,
        );

        if (!(yield* fs.exists(thumbsBaseDir))) {
          return yield* new NotFoundError({
            message: "no thumbnails for this project",
          });
        }

        const [lightSheets, darkSheets, job] = yield* Effect.all(
          [
            readThumbSheets(path.join(thumbsBaseDir, RelativeDir("light"))),
            readThumbSheets(path.join(thumbsBaseDir, RelativeDir("dark"))),
            readThumbsJob(thumbsBaseDir),
          ],
          { concurrency: "unbounded" },
        );

        return {
          dark: darkSheets,
          job,
          light: lightSheets,
        };
      }).pipe(
        Effect.catchTags({
          FileDecodeError: Effect.die,
          PlatformError: Effect.die,
        }),
      ),
    )
    .handle("generate", ({ query: { projectPath }, payload = {} }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        const { basePath, productionServerPort } = getServerState();

        const thumbsBaseDir = inRoutesDir(projectPath, THUMBS_BASE_DIR);

        // Build the URL for the video
        const previewPath = `${basePath || ""}/${projectPath}/`;
        const url = `http://localhost:${productionServerPort}${previewPath}`;

        const colorScheme = payload.colorScheme ?? "both";

        // Ensure thumbs base directory exists
        yield* fs.makeDirectory(thumbsBaseDir, { recursive: true });

        // Resolve options with defaults
        const { config: $config } = getServerState();
        const defaults = $config.pipe(
          Option.flatMapNullishOr(
            (config) => config.media?.thumbnails?.defaults,
          ),
          Option.getOrElse(() => ({}) as Partial<ThumbnailOptions>),
        );

        const imageFormat = payload.imageFormat ?? defaults.imageFormat;

        const resolvedOptions: ThumbnailsJobIn = {
          colorScheme,
          cols: payload.cols ?? defaults.cols,
          frequency: payload.frequency ?? defaults.frequency,
          height: payload.height ?? defaults.height,
          imageFormat: payload.imageFormat ?? defaults.imageFormat,
          quality:
            imageFormat === "jpeg"
              ? (payload.quality ?? defaults.quality)
              : undefined,
          rows: payload.rows ?? defaults.rows,
          width: payload.width ?? defaults.width,
        };

        // Save job options to file
        const jobFilePath = path.join(thumbsBaseDir, THUMBS_JOB_FILE);
        yield* writeJSON(jobFilePath, resolvedOptions);

        let lightSheets: string[] = [];
        let darkSheets: string[] = [];

        if (colorScheme === "light" || colorScheme === "both") {
          const lightDir = path.join(thumbsBaseDir, LIGHT_DIR);
          lightSheets = yield* generateForScheme(
            url,
            lightDir,
            "light",
            payload,
            projectPath,
          );
        }

        if (colorScheme === "dark" || colorScheme === "both") {
          const darkDir = path.join(thumbsBaseDir, DARK_DIR);
          darkSheets = yield* generateForScheme(
            url,
            darkDir,
            "dark",
            payload,
            projectPath,
          );
        }

        const numSheets = Math.max(lightSheets.length, darkSheets.length);

        return {
          dark: darkSheets.length > 0 ? darkSheets : undefined,
          light: lightSheets.length > 0 ? lightSheets : undefined,
          numSheets,
        };
      }).pipe(
        Effect.catchTags({
          PlatformError: Effect.die,
        }),
      ),
    ),
);
