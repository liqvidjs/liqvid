import { NodeFileSystem } from "@effect/platform-node";
import type { ImageFormat } from "@liqvid/schemas/effect";
import { parseTime } from "@liqvid/utils";
import { Console, Effect, Exit } from "effect";
import type { CommandModule } from "yargs";

import { defaultCliProgressLayer } from "../utils/progress.mts";

import {
  BROWSER_EXECUTABLE,
  CONCURRENCY,
  DEFAULT_CONFIG,
  parseConfig,
} from "./config.mts";

/**
 * Options for rendering a video.
 */
export interface RenderOptions {
  /** Additional flags to pass to ffmpeg, applying to the audio file */
  audioArgs?: string;

  /** Path to audio file */
  audioFile?: string;

  /** Path to browser executable (optional, will auto-detect) */
  browserExecutable?: string;

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
export function renderVideo(options: RenderOptions) {
  return Effect.gen(function* () {
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
      audioFile: options.audioFile as string,
      browserExecutable: options.browserExecutable ?? "",
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
}

/** Render to static video. */
export const render: CommandModule = {
  builder: (yargs) =>
    yargs
      .config("config", parseConfig("render"))
      .default("config", DEFAULT_CONFIG)
      .example([
        ["liqvid render"],
        ["liqvid render -a ./audio/audio.webm -o video.webm"],
        ["liqvid render -u http://localhost:8080/dist/"],
      ])
      // Selection
      .group(["audio-file", "output", "url"], "What to render")
      .option("audio-file", {
        alias: "a",
        desc: "Path to audio file",
        normalize: true,
      })
      .option("output", {
        alias: "o",
        default: "./video.mp4",
        demandOption: true,
        desc: "Output filename",
        normalize: true,
      })
      .option("url", {
        alias: "u",
        desc: "URL of video to render",
      })
      // General configuration
      .group(
        ["browser-executable", "concurrency", "config", "help"],
        "General options",
      )
      .option("browser-executable", BROWSER_EXECUTABLE)
      .option("concurrency", CONCURRENCY)
      // Input options
      .group(
        ["duration", "end", "sequence", "start", "color-scheme"],
        "Input options",
      )
      .option("start", {
        alias: "s",
        coerce: coerceTime,
        default: "00:00",
        desc: "Start time, specify as [hh:]mm:ss[.ms]",
        type: "string",
      })
      .option("duration", {
        alias: "d",
        conflicts: "end",
        desc: "Duration, specify as [hh:]mm:ss[.ms]",
        type: "string",
      })
      .coerce("duration", coerceTime)
      .option("end", {
        alias: "e",
        desc: "End time, specify as [hh:]mm:ss[.ms]",
        type: "string",
      })
      .coerce("end", coerceTime)
      .option("sequence", {
        alias: "S",
        desc: "Output image sequence instead of video. If this flag is set, --output will be interpreted as a directory.",
        type: "boolean",
      })
      .option("color-scheme", {
        choices: ["light", "dark"] as const,
        default: "light" as "light" | "dark",
        desc: "Color scheme",
      })
      // Frames
      .group(["height", "image-format", "quality", "width"], "Frame formatting")
      .option("height", {
        alias: "h",
        default: 800,
        desc: "Video height",
      })
      .option("image-format", {
        alias: "F",
        choices: ["jpeg", "png"] as const,
        default: "jpeg" as "jpeg" | "png",
        desc: "Image format for frames",
      })
      .option("quality", {
        alias: "q",
        default: 80,
        desc: 'Quality for images. Only applies when --image-format is "jpeg"',
      })
      .option("width", {
        alias: "w",
        default: 1280,
        desc: "Video width",
      })
      // ffmpeg
      .group(
        ["audio-args", "fps", "pixel-format", "video-args"],
        "Video options",
      )
      .option("audio-args", {
        alias: "A",
        desc: "Additional flags to pass to ffmpeg, applying to the audio file",
        type: "string",
      })
      .option("fps", {
        alias: "r",
        default: 30,
        desc: "Frames per second",
      })
      .option("pixel-format", {
        alias: "P",
        default: "yuv420p",
        desc: "Pixel format for ffmpeg",
      })
      .option("video-args", {
        alias: "V",
        desc: "Additional flags to pass to ffmpeg, applying to the output video",
        type: "string",
      })
      .version(false),
  command: "render",
  describe: "Render static video",
  handler: async (argv) => {
    const { solidify } = await import("@liqvid/renderer/solidify");

    const exit = await Effect.runPromiseExit(
      // biome-ignore lint/suspicious/noExplicitAny: argv is properly typed by yargs builder
      solidify(argv as any).pipe(
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

function coerceTime(v: string): number {
  if (typeof v === "undefined") {
    return v;
  }
  try {
    return parseTime(v);
  } catch {
    console.error(`Invalid time: ${v}. Specify as [hh:]mm:ss[.ms]`);
    process.exit(1);
  }
}
