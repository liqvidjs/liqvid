import { NodeFileSystem } from "@effect/platform-node";
import {
  ThumbnailOptions,
  type ThumbnailOptionsIn,
} from "@liqvid/schemas/jobs/thumbnails";
import { Console, Effect, Exit, FileSystem } from "effect";
import type { CommandModule } from "yargs";

import { defaultCliProgressLayer } from "../utils/progress.mts";

import {
  BROWSER_EXECUTABLE,
  CONCURRENCY,
  DEFAULT_CONFIG,
  parseConfigWithTransform,
} from "./config.mts";

/**
 * Image format for thumbnails.
 */
export type ImageFormat = "jpeg" | "png";

/**
 * Result of thumbnail generation.
 */
export interface ThumbsResult {
  /** Number of thumbnail sheets generated */
  numSheets: number;
  /** Output pattern used */
  output: string;
}

/**
 * Generate thumbnail sheets for a Liqvid video.
 *
 * @example
 * ```ts
 * import { generateThumbs } from "@liqvid/cli/thumbs";
 *
 * await generateThumbs({
 *   url: "http://localhost:3000/projects/my-video",
 *   output: "./thumbs/%s.jpeg",
 * });
 * ```
 */
export function generateThumbs(
  options: ThumbnailOptionsIn & {
    /**
     * Pattern for output filenames
     * Interpolation patterns:
     * - `%s` sheet number (required)
     */
    output: string;

    /** URL of video to generate thumbs for */
    url: string;
  },
) {
  return Effect.gen(function* () {
    const path = yield* Effect.promise(() => import("node:path"));
    const fs = yield* FileSystem.FileSystem;

    const { thumbs: renderThumbs } = yield* Effect.promise(
      () => import("@liqvid/renderer/thumbs"),
    );

    const schema = ThumbnailOptions.def.shape;

    // Apply defaults
    const cols = options.cols ?? schema.cols.def.defaultValue;
    const rows = options.rows ?? schema.rows.def.defaultValue;
    const frequency = options.frequency ?? schema.frequency.def.defaultValue;
    const width = options.width ?? schema.width.def.defaultValue;
    const height = options.height ?? schema.height.def.defaultValue;
    const imageFormat =
      options.imageFormat ?? schema.imageFormat.def.defaultValue;
    const colorScheme =
      options.colorScheme ?? schema.colorScheme.def.defaultValue;
    const quality = options.quality ?? schema.quality.def.defaultValue;
    const concurrency =
      options.concurrency ?? schema.concurrency.def.defaultValue;

    yield* renderThumbs({
      browserExecutable: options.browserExecutable ?? "",
      browserHeight: options.browserHeight ?? height,
      browserWidth: options.browserWidth ?? width,
      colorScheme,
      cols,
      concurrency,
      frequency,
      height,
      imageFormat,
      output: options.output,
      quality,
      rows,
      url: options.url,
      width,
    });

    // Calculate number of sheets based on video duration
    // Since we don't have direct access to the result, we'll read the output directory

    const outputDir = path.dirname(options.output);
    const ext = `.${imageFormat}`;

    const files = yield* fs
      .readDirectory(outputDir)
      .pipe(Effect.catch(() => Effect.succeed([])));

    const sheets = files.filter(
      (f) => /^\d+\.(jpeg|png)$/.test(f) && f.endsWith(ext),
    );

    return {
      numSheets: sheets.length,
      output: options.output,
    };
  });
}

/**
 * Transform thumbnail config from liqvid.json to CLI option names.
 */
function transformThumbnailConfig(
  config: Partial<ThumbnailOptionsIn> & {
    output: string;
    url: string;
  },
): Record<string, unknown> {
  return {
    "browser-executable": config.browserExecutable,
    "browser-height": config.browserHeight,
    "browser-width": config.browserWidth,
    "color-scheme": config.colorScheme,
    cols: config.cols,
    concurrency: config.concurrency,
    frequency: config.frequency,
    height: config.height,
    "image-format": config.imageFormat,
    output: config.output,
    quality: config.quality,
    rows: config.rows,
    url: config.url,
    width: config.width,
  };
}

export const thumbs: CommandModule = {
  builder: (yargs) =>
    yargs
      .config(
        "config",
        parseConfigWithTransform(
          ["media", "thumbnails", "defaults"],
          transformThumbnailConfig,
        ),
      )
      .default("config", DEFAULT_CONFIG)
      .example([
        ["liqvid thumbs"],
        [
          "liqvid thumbs -u http://localhost:4000/video -o ./.liqvid/thumbs/%s.jpeg",
        ],
      ])
      // Selection
      .group(["output", "url"], "What to render")
      .option("output", {
        alias: "o",
        default: "./thumbs/%s.jpeg",
        desc: "Pattern for output filenames.",
        normalize: true,
      })
      .option("url", {
        alias: "u",
        desc: "URL of video to generate thumbs for",
      })
      // General
      .group(
        ["browser-executable", "concurrency", "config", "help"],
        "General options",
      )
      .option("browser-executable", BROWSER_EXECUTABLE)
      .option("concurrency", CONCURRENCY)
      // Format
      .group(
        [
          "color-scheme",
          "browser-height",
          "browser-width",
          "cols",
          "frequency",
          "height",
          "image-format",
          "quality",
          "rows",
          "width",
        ],
        "Formatting",
      )
      .option("color-scheme", {
        choices: ["light", "dark"] as const,
        default: "light" as "light" | "dark",
        desc: "Color scheme",
      })
      .option("cols", {
        alias: "c",
        default: 5,
        desc: "The number of columns per sheet",
      })
      .option("frequency", {
        alias: "f",
        default: 4,
        desc: "How many seconds between screenshots",
      })
      .option("rows", {
        alias: "r",
        default: 5,
        desc: "The number of rows per sheet",
      })
      .option("quality", {
        alias: "q",
        default: 80,
        desc: 'Quality for images. Only applies when --image-format is "jpeg"',
      })
      .option("height", {
        alias: "h",
        default: 100,
        desc: "Height of each thumbnail",
      })
      .option("width", {
        alias: "w",
        default: 160,
        desc: "Width of each thumbnail",
      })
      .option("browser-height", {
        alias: "H",
        desc: "Height of screenshot before resizing",
        type: "number",
      })
      .option("browser-width", {
        alias: "W",
        desc: "Width of screenshot before resizing",
        type: "number",
      })
      .option("image-format", {
        alias: "F",
        choices: ["jpeg", "png"] as const,
        default: "jpeg" as "jpeg" | "png",
        desc: "Image format for thumbnails",
      })
      .version(false),
  command: "thumbs",
  describe: "Generate thumbnails",
  handler: async (argv) => {
    const { thumbs: renderThumbs } = await import("@liqvid/renderer/thumbs");

    const exit = await Effect.runPromiseExit(
      // biome-ignore lint/suspicious/noExplicitAny: argv is properly typed by yargs builder
      renderThumbs(argv as any).pipe(
        Effect.provide(NodeFileSystem.layer),
        Effect.tapError(Console.error),
        Effect.provide(defaultCliProgressLayer()),
      ),
    );

    if (Exit.isFailure(exit)) {
      process.exit(1);
    }

    process.exit(0);
  },
};
