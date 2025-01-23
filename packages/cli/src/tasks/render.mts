import {parseTime} from "@liqvid/utils/time";
import type Yargs from "yargs";
import {
  BROWSER_EXECUTABLE,
  CONCURRENCY,
  DEFAULT_CONFIG,
  parseConfig,
} from "./config.mjs";

/** Render to static video. */
export const render = (yargs: typeof Yargs) =>
  yargs.command(
    "render",
    "Render static video",
    (yargs) =>
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
          desc: "Output filename",
          normalize: true,
          demandOption: true,
        })
        .option("url", {
          alias: "u",
          desc: "URL of video to render",
          default: "http://localhost:3000/dist/",
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
          default: "light" as "light" | "dark",
          choices: ["light", "dark"] as const,
          desc: "Color scheme",
        })
        // Frames
        .group(
          ["height", "image-format", "quality", "width"],
          "Frame formatting",
        )
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
    async (argv) => {
      const {solidify} = await import("@liqvid/renderer/solidify");
      await solidify(argv);
      process.exit(0);
    },
  );

function coerceTime(v: string): number {
  if (typeof v === "undefined") {
    return v;
  }
  try {
    return parseTime(v);
  } catch (e) {
    console.error(`Invalid time: ${v}. Specify as [hh:]mm:ss[.ms]`);
    process.exit(1);
  }
}
