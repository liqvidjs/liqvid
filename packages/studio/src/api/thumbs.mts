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
  THUMBS_DIR,
} from "#_/conventions.mjs";
import { getServerState } from "#_/initialize.mjs";
import { NotFoundError } from "#_/utils/errors.mjs";
import { createJob } from "#_/utils/jobs.mjs";
import { getConfig, getRenderUrl, getRoutesDir } from "#_/utils/misc.mjs";
import {
  ensureParamsMarker,
  extractParameterNames,
  getParameterizedAssetsDir,
} from "#_/utils/parameters.mjs";

import { WebApi } from "./contract.mts";

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
const readThumbSheets = Effect.fnUntraced(function* (dir: AbsoluteDir) {
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

/**
 * Generate thumbnails for one or more color schemes in a single job.
 *
 * All schemes share a single browser session (the URL is loaded once), which
 * avoids overloading the dev server with simultaneous cold page loads.
 */
const generateThumbnails = Effect.fn("generateThumbnails")(function* (
  url: string,
  schemes: readonly { colorScheme: "light" | "dark"; outputDir: AbsoluteDir }[],
  { colorScheme: _, ...body }: GenerateThumbsBody,
  projectPath: RelativeDir,
) {
  const { config: $config } = getServerState();
  const fs = yield* FileSystem.FileSystem;

  const defaults = $config.pipe(
    Option.flatMapNullishOr((config) => config.media?.thumbnails?.defaults),
    Option.getOrElse(() => ({}) as Partial<ThumbnailOptions>),
  );

  const imageFormat = body.imageFormat ?? defaults?.imageFormat ?? "jpeg";

  // Ensure output directories exist
  yield* Effect.all(
    schemes.map(({ outputDir }) =>
      fs.makeDirectory(outputDir, { recursive: true }),
    ),
    { concurrency: "unbounded" },
  );

  yield* createJob(
    "thumbnails",
    generateThumbsApi({
      ...defaults,
      ...body,
      imageFormat,
      schemes: schemes.map(({ colorScheme, outputDir }) => ({
        colorScheme,
        output: path.join(outputDir, RelativeFile(`%s.${imageFormat}`)),
      })),
      url,
    }),
    { path: projectPath },
  );

  return yield* Effect.all(
    schemes.map(({ outputDir }) => readThumbSheets(outputDir)),
    { concurrency: "unbounded" },
  );
});

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
    .handle("list", ({ query: { projectPath, params: paramsJson } }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        // Parse params if provided
        const params = paramsJson
          ? (JSON.parse(paramsJson) as Record<string, string>)
          : undefined;

        const routesDir = getRoutesDir();
        const assetsDir = getParameterizedAssetsDir(
          routesDir as AbsoluteDir,
          projectPath,
          params,
        );

        // read directories
        const thumbsBaseDir = path.join(assetsDir, THUMBS_DIR);

        if (!(yield* fs.exists(thumbsBaseDir))) {
          return yield* new NotFoundError({
            message: "no thumbnails for this project",
          });
        }

        const [lightSheets, darkSheets, job] = yield* Effect.all(
          [
            readThumbSheets(path.join(thumbsBaseDir, RelativeDir("light"))),
            readThumbSheets(path.join(thumbsBaseDir, RelativeDir("dark"))),
            readThumbsJob(thumbsBaseDir).pipe(
              Effect.catchReason("PlatformError", "NotFound", () =>
                Effect.fail(
                  new NotFoundError({
                    message: "missing thumbnails job file",
                  }),
                ),
              ),
            ),
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

        const config = yield* getConfig();
        const routesDir = getRoutesDir();

        // Ensure params marker exists for parameterized projects
        const paramNames = extractParameterNames(projectPath);
        if (paramNames.length > 0) {
          const baseAssetsDir = path.join(routesDir, projectPath, ASSETS_DIR);
          yield* ensureParamsMarker(baseAssetsDir as AbsoluteDir, projectPath);
        }

        const assetsDir = getParameterizedAssetsDir(
          routesDir as AbsoluteDir,
          projectPath,
          payload.params,
        );

        const thumbsBaseDir = path.join(assetsDir, THUMBS_DIR);

        const renderSource = config.media?.thumbnails?.source ?? "preview";

        const url = yield* getRenderUrl(
          renderSource,
          projectPath,
          payload.params,
        );

        const colorScheme = payload.colorScheme ?? "both";

        // Ensure thumbs base directory exists
        yield* fs.makeDirectory(thumbsBaseDir, { recursive: true });

        // Resolve options with defaults
        const defaults: Partial<ThumbnailOptions> =
          config.media?.thumbnails?.defaults ?? {};

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

        // Build the list of schemes to capture (shared single browser session).
        const wantLight = colorScheme === "light" || colorScheme === "both";
        const wantDark = colorScheme === "dark" || colorScheme === "both";

        const schemes = [
          ...(wantLight
            ? [
                {
                  colorScheme: "light" as const,
                  outputDir: path.join(thumbsBaseDir, LIGHT_DIR),
                },
              ]
            : []),
          ...(wantDark
            ? [
                {
                  colorScheme: "dark" as const,
                  outputDir: path.join(thumbsBaseDir, DARK_DIR),
                },
              ]
            : []),
        ];

        const sheetsByScheme = yield* generateThumbnails(
          url,
          schemes,
          payload,
          projectPath,
        );

        const lightIndex = schemes.findIndex((s) => s.colorScheme === "light");
        const darkIndex = schemes.findIndex((s) => s.colorScheme === "dark");

        const lightSheets = lightIndex >= 0 ? sheetsByScheme[lightIndex]! : [];
        const darkSheets = darkIndex >= 0 ? sheetsByScheme[darkIndex]! : [];

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
