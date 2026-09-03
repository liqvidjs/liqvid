import { NodeFileSystem } from "@effect/platform-node";
import { ThumbnailOptions, type ThumbnailOptionsIn } from "@liqvid/schemas";
import { Console, Effect, Exit, FileSystem, Schema } from "effect";
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
export const generateThumbs = Effect.fnUntraced(function* (
  options: ThumbnailOptionsIn & {
    /**
     * Pattern for output filenames
     * Interpolation patterns:
     * - `%s` sheet number (required)
     *
     * Ignored when `schemes` is provided.
     */
    output?: string;

    /**
     * Multiple color schemes to capture in a single browser session. When
     * provided, `colorScheme`/`output` are ignored and each scheme is captured
     * by reusing the same loaded pages (only one page load per URL).
     */
    schemes?: readonly { colorScheme: "light" | "dark"; output: string }[];

    /** URL of video to generate thumbs for */
    url: string;
  },
) {
  const path = yield* Effect.promise(() => import("node:path"));
  const fs = yield* FileSystem.FileSystem;

  const { thumbs: renderThumbs } = yield* Effect.promise(
    () => import("@liqvid/renderer/thumbs"),
  );

  // Decode an empty object to obtain the schema's default values.
  const defaults = Schema.decodeUnknownSync(ThumbnailOptions)({});

  // Apply defaults
  const cols = options.cols ?? defaults.cols;
  const rows = options.rows ?? defaults.rows;
  const frequency = options.frequency ?? defaults.frequency;
  const width = options.width ?? defaults.width;
  const height = options.height ?? defaults.height;
  const imageFormat = options.imageFormat ?? defaults.imageFormat;
  const colorScheme = options.colorScheme ?? defaults.colorScheme;
  const quality = options.quality ?? defaults.quality;
  const concurrency = options.concurrency ?? defaults.concurrency;

  // Normalize to a list of scheme passes.
  const passes =
    options.schemes && options.schemes.length > 0
      ? options.schemes
      : [{ colorScheme, output: options.output! }];

  yield* renderThumbs({
    browserExecutable: options.browserExecutable,
    browserHeight: options.browserHeight ?? height,
    browserWidth: options.browserWidth ?? width,
    cols,
    concurrency,
    frequency,
    height,
    imageFormat,
    quality,
    rows,
    schemes: passes,
    url: options.url,
    width,
  });

  // Calculate number of sheets by reading each scheme's output directory.
  const ext = `.${imageFormat}`;

  const perSchemeCounts = yield* Effect.all(
    passes.map(({ output }) =>
      Effect.gen(function* () {
        const files = yield* fs
          .readDirectory(path.dirname(output))
          .pipe(Effect.catch(() => Effect.succeed([])));
        return files.filter(
          (f) => /^\d+\.(jpeg|png)$/.test(f) && f.endsWith(ext),
        ).length;
      }),
    ),
    { concurrency: "unbounded" },
  );

  return {
    numSheets: Math.max(0, ...perSchemeCounts),
    output: passes[0]!.output,
  };
});

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
