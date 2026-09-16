import os from "node:os";

import { NodeFileSystem } from "@effect/platform-node";
import { ThumbnailOptions, type ThumbnailOptionsIn } from "@liqvid/schemas";
import { Console, Effect, Exit, FileSystem, Option, Schema } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import type { AbsoluteFile } from "effect-paths";

import { defaultCliProgressLayer } from "../utils/progress.mts";

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
  options: ThumbnailOptionsIn &
    Pick<ThumbnailOptions, "browserExecutable"> & {
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

export const thumbs = Command.make(
  "thumbs",
  {
    browserExecutable: Flag.String("browser-executable").pipe(
      Flag.withAlias("x"),
      Flag.withDescription(
        "Path to a Chrome/ium executable. If not specified and a suitable executable cannot be found, one will be downloaded during rendering.",
      ),
      Flag.optional,
    ),
    browserHeight: Flag.Int("browser-height").pipe(
      Flag.withAlias("H"),
      Flag.withDescription("Height of screenshot before resizing"),
      Flag.optional,
    ),
    browserWidth: Flag.Int("browser-width").pipe(
      Flag.withAlias("W"),
      Flag.withDescription("Width of screenshot before resizing"),
      Flag.optional,
    ),
    colorScheme: Flag.Literals("color-scheme", ["light", "dark"]).pipe(
      Flag.withDescription("Color scheme"),
      Flag.withDefault("light" as const),
    ),
    cols: Flag.Int("cols").pipe(
      Flag.withAlias("c"),
      Flag.withDescription("The number of columns per sheet"),
      Flag.withDefault(5),
    ),
    concurrency: Flag.Int("concurrency").pipe(
      Flag.withAlias("n"),
      Flag.withDescription("How many threads to use"),
      Flag.withDefault(Math.floor(os.cpus().length / 2)),
    ),
    frequency: Flag.Int("frequency").pipe(
      Flag.withAlias("f"),
      Flag.withDescription("How many seconds between screenshots"),
      Flag.withDefault(4),
    ),
    height: Flag.Int("height").pipe(
      Flag.withAlias("h"),
      Flag.withDescription("Height of each thumbnail"),
      Flag.withDefault(100),
    ),
    imageFormat: Flag.Literals("image-format", ["jpeg", "png"]).pipe(
      Flag.withAlias("F"),
      Flag.withDescription("Image format for thumbnails"),
      Flag.withDefault("jpeg" as const),
    ),
    output: Flag.String("output").pipe(
      Flag.withAlias("o"),
      Flag.withDescription("Pattern for output filenames."),
      Flag.withDefault("./thumbs/%s.jpeg"),
    ),
    quality: Flag.Int("quality").pipe(
      Flag.withAlias("q"),
      Flag.withDescription(
        'Quality for images. Only applies when --image-format is "jpeg"',
      ),
      Flag.withDefault(80),
    ),
    rows: Flag.Int("rows").pipe(
      Flag.withAlias("r"),
      Flag.withDescription("The number of rows per sheet"),
      Flag.withDefault(5),
    ),
    url: Flag.String("url").pipe(
      Flag.withAlias("u"),
      Flag.withDescription("URL of video to generate thumbs for"),
      Flag.optional,
    ),
    width: Flag.Int("width").pipe(
      Flag.withAlias("w"),
      Flag.withDescription("Width of each thumbnail"),
      Flag.withDefault(160),
    ),
  },
  (argv) =>
    Effect.gen(function* () {
      const { thumbs: renderThumbs } = yield* Effect.promise(
        () => import("@liqvid/renderer/thumbs"),
      );

      const exit = yield* Effect.exit(
        renderThumbs({
          browserExecutable: Option.getOrUndefined(
            argv.browserExecutable,
          ) as AbsoluteFile,
          browserHeight: Option.getOrUndefined(argv.browserHeight),
          browserWidth: Option.getOrUndefined(argv.browserWidth),
          colorScheme: argv.colorScheme,
          cols: argv.cols,
          concurrency: argv.concurrency,
          frequency: argv.frequency,
          height: argv.height,
          imageFormat: argv.imageFormat,
          output: argv.output,
          quality: argv.quality,
          rows: argv.rows,
          url: Option.getOrUndefined(argv.url) as string,
          width: argv.width,
        } as Parameters<typeof renderThumbs>[0]).pipe(
          Effect.provide(NodeFileSystem.layer),
          Effect.tapError(Console.error),
          Effect.provide(defaultCliProgressLayer()),
        ),
      );

      if (Exit.isFailure(exit)) {
        process.exit(1);
      }

      process.exit(0);
    }),
).pipe(Command.withDescription("Generate thumbnails"));
