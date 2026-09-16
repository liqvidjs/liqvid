import os from "node:os";

import { NodeFileSystem } from "@effect/platform-node";
import type { ImageFormat } from "@liqvid/schemas";
import { parseTime } from "@liqvid/utils";
import { Console, Effect, Exit, Option } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import type { AbsoluteFile } from "effect-paths";

import { defaultCliProgressLayer } from "../utils/progress.mts";

/**
 * Options for rendering a video.
 */
export interface RenderOptions {
  /** Additional flags to pass to ffmpeg, applying to the audio file */
  audioArgs?: string;

  /** Path to browser executable (optional, will auto-detect) */
  browserExecutable?: AbsoluteFile;

  /** Color scheme: light or dark */
  colorScheme?: "light" | "dark";

  /** Number of concurrent browser instances */
  concurrency?: number;

  /** Duration in seconds (conflicts with end) */
  duration?: number;

  /** End time in seconds (conflicts with duration) */
  end?: number;

  /** Frames per second */
  fps?: number;

  /** Video height */
  height?: number;

  /** Image format for frames */
  imageFormat?: ImageFormat;

  /** Output filename */
  output: string;

  /** Pixel format for ffmpeg */
  pixelFormat?: string;

  /** Quality for JPEG images (0-100) */
  quality?: number;

  /** Output image sequence instead of video */
  sequence?: boolean;

  /** Start time in seconds */
  start?: number;

  /** URL of video to render */
  url: string;

  /** Additional flags to pass to ffmpeg, applying to the output video */
  videoArgs?: string;

  /** Video width */
  width?: number;
}

/**
 * Result of video rendering.
 */
export interface RenderResult {
  /** Duration of the rendered video in seconds */
  duration: number;

  /** Output file path */
  output: string;
}

/**
 * Render a Liqvid video to a static video file.
 *
 * @example
 * ```ts
 * import { renderVideo } from "@liqvid/cli/render";
 *
 * await renderVideo({
 *   url: "http://localhost:3000/projects/my-video",
 *   output: "./renders/video.mp4",
 * });
 * ```
 */
export const renderVideo = Effect.fnUntraced(function* (
  options: RenderOptions,
) {
  const { solidify } = yield* Effect.promise(
    () => import("@liqvid/renderer/solidify"),
  );

  // Apply defaults
  const colorScheme = options.colorScheme ?? "light";
  const concurrency = options.concurrency ?? 1;
  const fps = options.fps ?? 30;
  const height = options.height ?? 800;
  const width = options.width ?? 1280;
  const imageFormat = options.imageFormat ?? "jpeg";
  const quality = options.quality ?? 80;
  const pixelFormat = options.pixelFormat ?? "yuv420p";
  const start = options.start ?? 0;
  const sequence = options.sequence ?? false;

  // Note: solidify's types are stricter than the runtime - it handles undefined
  // values for optional fields. We use type assertions here.
  yield* solidify({
    audioArgs: options.audioArgs as string,
    browserExecutable: options.browserExecutable,
    colorScheme,
    concurrency,
    duration: options.duration as number,
    end: options.end as number,
    fps,
    height,
    imageFormat,
    output: options.output,
    pixelFormat,
    quality,
    sequence,
    start,
    url: options.url,
    videoArgs: options.videoArgs as string,
    width,
  });

  // Calculate actual duration
  const duration = (() => {
    if (typeof options.duration === "number") {
      return options.duration;
    } else if (typeof options.end === "number") {
      return options.end - start;
    }
    // We don't know the actual duration without querying the video
    return 0;
  })();

  return {
    duration,
    output: options.output,
  };
});

/** Render to static video. */
export const render = Command.make(
  "render",
  {
    audioArgs: Flag.String("audio-args").pipe(
      Flag.withAlias("A"),
      Flag.withDescription(
        "Additional flags to pass to ffmpeg, applying to the audio file",
      ),
      Flag.optional,
    ),
    browserExecutable: Flag.String("browser-executable").pipe(
      Flag.withAlias("x"),
      Flag.withDescription(
        "Path to a Chrome/ium executable. If not specified and a suitable executable cannot be found, one will be downloaded during rendering.",
      ),
      Flag.optional,
    ),
    colorScheme: Flag.Literals("color-scheme", ["light", "dark"]).pipe(
      Flag.withDescription("Color scheme"),
      Flag.withDefault("light" as const),
    ),
    concurrency: Flag.Int("concurrency").pipe(
      Flag.withAlias("n"),
      Flag.withDescription("How many threads to use"),
      Flag.withDefault(Math.floor(os.cpus().length / 2)),
    ),
    duration: Flag.String("duration").pipe(
      Flag.withAlias("d"),
      Flag.withDescription("Duration, specify as [hh:]mm:ss[.ms]"),
      Flag.mapTryCatch(
        (s: string) => parseTime(s),
        (error) => `Invalid time: ${error}`,
      ),
      Flag.optional,
    ),
    end: Flag.String("end").pipe(
      Flag.withAlias("e"),
      Flag.withDescription("End time, specify as [hh:]mm:ss[.ms]"),
      Flag.mapTryCatch(
        (s: string) => parseTime(s),
        (error) => `Invalid time: ${error}`,
      ),
      Flag.optional,
    ),
    fps: Flag.Int("fps").pipe(
      Flag.withAlias("r"),
      Flag.withDescription("Frames per second"),
      Flag.withDefault(30),
    ),
    height: Flag.Int("height").pipe(
      Flag.withAlias("h"),
      Flag.withDescription("Video height"),
      Flag.withDefault(800),
    ),
    imageFormat: Flag.Literals("image-format", ["jpeg", "png"]).pipe(
      Flag.withAlias("F"),
      Flag.withDescription("Image format for frames"),
      Flag.withDefault("jpeg" as const),
    ),
    output: Flag.String("output").pipe(
      Flag.withAlias("o"),
      Flag.withDescription("Output filename"),
      Flag.withDefault("./video.mp4"),
    ),
    pixelFormat: Flag.String("pixel-format").pipe(
      Flag.withAlias("P"),
      Flag.withDescription("Pixel format for ffmpeg"),
      Flag.withDefault("yuv420p"),
    ),
    quality: Flag.Int("quality").pipe(
      Flag.withAlias("q"),
      Flag.withDescription(
        'Quality for images. Only applies when --image-format is "jpeg"',
      ),
      Flag.withDefault(80),
    ),
    sequence: Flag.Boolean("sequence").pipe(
      Flag.withAlias("S"),
      Flag.withDescription(
        "Output image sequence instead of video. If this flag is set, --output will be interpreted as a directory.",
      ),
      Flag.withDefault(false),
    ),
    start: Flag.String("start").pipe(
      Flag.withAlias("s"),
      Flag.withDescription("Start time, specify as [hh:]mm:ss[.ms]"),
      Flag.mapTryCatch(
        (s: string) => parseTime(s),
        (error) => `Invalid time: ${error}`,
      ),
      Flag.withDefault(0),
    ),
    url: Flag.String("url").pipe(
      Flag.withAlias("u"),
      Flag.withDescription("URL of video to render"),
      Flag.optional,
    ),
    videoArgs: Flag.String("video-args").pipe(
      Flag.withAlias("V"),
      Flag.withDescription(
        "Additional flags to pass to ffmpeg, applying to the output video",
      ),
      Flag.optional,
    ),
    width: Flag.Int("width").pipe(
      Flag.withAlias("w"),
      Flag.withDescription("Video width"),
      Flag.withDefault(1280),
    ),
  },
  (argv) =>
    Effect.gen(function* () {
      const { solidify } = yield* Effect.promise(
        () => import("@liqvid/renderer/solidify"),
      );

      const exit = yield* Effect.exit(
        solidify({
          audioArgs: Option.getOrUndefined(argv.audioArgs) as string,
          browserExecutable: Option.getOrUndefined(
            argv.browserExecutable,
          ) as AbsoluteFile,
          colorScheme: argv.colorScheme,
          concurrency: argv.concurrency,
          duration: Option.getOrUndefined(argv.duration) as number,
          end: Option.getOrUndefined(argv.end) as number,
          fps: argv.fps,
          height: argv.height,
          imageFormat: argv.imageFormat,
          output: argv.output,
          pixelFormat: argv.pixelFormat,
          quality: argv.quality,
          sequence: argv.sequence,
          start: argv.start,
          url: Option.getOrUndefined(argv.url) as string,
          videoArgs: Option.getOrUndefined(argv.videoArgs) as string,
          width: argv.width,
        }).pipe(
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
).pipe(Command.withDescription("Render static video"));
