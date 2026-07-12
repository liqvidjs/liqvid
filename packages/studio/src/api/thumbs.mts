import * as path from "node:path";

import { generateThumbs as generateThumbsApi } from "@liqvid/cli/thumbs";
import { loadJsonEffect, writeJSON } from "@liqvid/cli/utils";
import {
  type ThumbnailOptions,
  ThumbnailsJob,
  type ThumbnailsJobIn,
} from "@liqvid/schemas/effect";
import { Effect, FileSystem, Option } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { getServerState } from "../initialize.mts";

import { WebApi } from "./contract.mts";

const THUMBS_BASE_DIR = ".liqvid/thumbs";
const THUMBS_JOB_FILE = "thumbnails-job.json";

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
  outputDir: string,
  colorScheme: "light" | "dark",
  body: GenerateThumbsBody,
) {
  return Effect.gen(function* () {
    const { config: $config } = getServerState();
    const fs = yield* FileSystem.FileSystem;

    const defaults = $config.pipe(
      Option.flatMapNullishOr((config) => config.media?.thumbnails?.defaults),
      Option.getOrElse(() => ({}) as Partial<ThumbnailOptions>),
    );

    const imageFormat = body.imageFormat ?? defaults?.imageFormat ?? "jpeg";
    const outputPattern = path.join(outputDir, `%s.${imageFormat}`);

    // Ensure output directory exists
    yield* fs.makeDirectory(outputDir, { recursive: true });

    yield* Effect.promise(() =>
      generateThumbsApi({
        ...defaults,
        ...body,
        colorScheme,
        imageFormat,
        output: outputPattern,
        url,
      }),
    );

    return yield* readThumbSheets(outputDir);
  });
}

/**
 * Generate thumbnail sheets for a project.
 */
export function generateThumbs(
  searchParams: URLSearchParams,
  body: GenerateThumbsBody,
) {
  return Effect.gen(function* () {
    // validate parameters
    const projectPath = searchParams.get("projectPath");
    if (!projectPath) {
      return yield* Effect.die({
        message: "projectPath is required",
      });
    }

    const fs = yield* FileSystem.FileSystem;

    const { basePath, productionServerPort } = getServerState();
    const projectDir = path.join(process.cwd(), "app", projectPath);
    const thumbsBaseDir = path.join(projectDir, THUMBS_BASE_DIR);

    // Build the URL for the video
    const previewPath = `${basePath || ""}/${projectPath}/`;
    const url = `http://localhost:${productionServerPort}${previewPath}`;

    const colorScheme = body.colorScheme ?? "both";

    // Ensure thumbs base directory exists
    yield* fs.makeDirectory(thumbsBaseDir, { recursive: true });

    // Resolve options with defaults
    const { config: $config } = getServerState();
    const defaults = $config.pipe(
      Option.flatMapNullishOr((config) => config.media?.thumbnails?.defaults),
      Option.getOrElse(() => ({}) as Partial<ThumbnailOptions>),
    );

    const imageFormat = body.imageFormat ?? defaults.imageFormat;

    const resolvedOptions: ThumbnailsJobIn = {
      colorScheme,
      cols: body.cols ?? defaults.cols,
      frequency: body.frequency ?? defaults.frequency,
      height: body.height ?? defaults.height,
      imageFormat: body.imageFormat ?? defaults.imageFormat,
      quality:
        imageFormat === "jpeg" ? (body.quality ?? defaults.quality) : undefined,
      rows: body.rows ?? defaults.rows,
      width: body.width ?? defaults.width,
    };

    // Save job options to file
    const jobFilePath = path.join(thumbsBaseDir, THUMBS_JOB_FILE);
    yield* writeJSON(jobFilePath, resolvedOptions);

    let lightSheets: string[] = [];
    let darkSheets: string[] = [];

    if (colorScheme === "light" || colorScheme === "both") {
      const lightDir = path.join(thumbsBaseDir, "light");
      lightSheets = yield* generateForScheme(url, lightDir, "light", body);
    }

    if (colorScheme === "dark" || colorScheme === "both") {
      const darkDir = path.join(thumbsBaseDir, "dark");
      darkSheets = yield* generateForScheme(url, darkDir, "dark", body);
    }

    const numSheets = Math.max(lightSheets.length, darkSheets.length);

    return {
      dark: darkSheets.length > 0 ? darkSheets : undefined,
      light: lightSheets.length > 0 ? lightSheets : undefined,
      numSheets,
    };
  });
}

/**
 * Read the thumbnail job configuration from a project.
 */
function readThumbsJob(thumbsBaseDir: string) {
  const jobFilePath = path.join(thumbsBaseDir, THUMBS_JOB_FILE);
  return loadJsonEffect(ThumbnailsJob, jobFilePath);
}

export const thumbsLive = HttpApiBuilder.group(WebApi, "thumbs", (handlers) =>
  // list existing captions for a project
  handlers
    .handle("list", ({ query: { projectPath } }) => {
      return Effect.gen(function* () {
        // read directories
        const thumbsBaseDir = path.join(
          process.cwd(),
          "app",
          projectPath,
          THUMBS_BASE_DIR,
        );

        const [lightSheets, darkSheets, job] = yield* Effect.all(
          [
            readThumbSheets(path.join(thumbsBaseDir, "light")),
            readThumbSheets(path.join(thumbsBaseDir, "dark")),
            readThumbsJob(thumbsBaseDir),
          ],
          { concurrency: "unbounded" },
        );

        return {
          dark: darkSheets,
          job,
          light: lightSheets,
        };
      }).pipe(Effect.orDie);
    })
    .handle("generate", ({ query: { projectPath }, payload = {} }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        const { basePath, productionServerPort } = getServerState();
        const projectDir = path.join(process.cwd(), "app", projectPath);
        const thumbsBaseDir = path.join(projectDir, THUMBS_BASE_DIR);

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
        yield* fs.writeFileString(
          jobFilePath,
          JSON.stringify(resolvedOptions, null, 2),
        );

        let lightSheets: string[] = [];
        let darkSheets: string[] = [];

        if (colorScheme === "light" || colorScheme === "both") {
          const lightDir = path.join(thumbsBaseDir, "light");
          lightSheets = yield* generateForScheme(
            url,
            lightDir,
            "light",
            payload,
          );
        }

        if (colorScheme === "dark" || colorScheme === "both") {
          const darkDir = path.join(thumbsBaseDir, "dark");
          darkSheets = yield* generateForScheme(url, darkDir, "dark", payload);
        }

        const numSheets = Math.max(lightSheets.length, darkSheets.length);

        return {
          dark: darkSheets.length > 0 ? darkSheets : undefined,
          light: lightSheets.length > 0 ? lightSheets : undefined,
          numSheets,
        };
      }).pipe(Effect.orDie),
    ),
);
