import type { ScreenshotOptions } from "@liqvid/renderer/screenshot";
import type { CommandModule } from "yargs";

import { BROWSER_EXECUTABLE, DEFAULT_CONFIG, parseConfig } from "./config.mts";

/**
 * Result of screenshot capture.
 */
export interface ScreenshotResult {
  /** Path to the saved screenshot */
  path: string;

  /** Width of the screenshot */
  width: number;

  /** Height of the screenshot */
  height: number;
}

/**
 * Capture a screenshot from a Liqvid video.
 *
 * @example
 * ```ts
 * import { screenshot } from "@liqvid/cli/screenshot";
 *
 * await screenshot({
 *   url: "http://localhost:3000/projects/my-video",
 *   output: "./screenshot.png",
 *   time: 5,
 *   width: 1280,
 *   height: 720,
 * });
 * ```
 */
export async function screenshot(
  options: ScreenshotOptions,
): Promise<ScreenshotResult> {
  const { screenshot: renderScreenshot } = await import(
    "@liqvid/renderer/screenshot"
  );

  // TODO: load screenshot configuration from config file here

  return await renderScreenshot(options);
}

/** Capture a screenshot. */
export const screenshotCommand: CommandModule = {
  builder: (yargs) =>
    yargs
      .config("config", parseConfig("screenshot"))
      .default("config", DEFAULT_CONFIG)
      .example([
        ["liqvid screenshot -u http://localhost:3000 -o screenshot.png"],
        ["liqvid screenshot -u http://localhost:3000 -o screenshot.png -t 5"],
      ])
      // Selection
      .group(["output", "url", "time"], "What to capture")
      .option("output", {
        alias: "o",
        default: "./screenshot.png",
        demandOption: true,
        desc: "Output filename",
        normalize: true,
      })
      .option("url", {
        alias: "u",
        desc: "URL of video to capture",
      })
      .option("time", {
        alias: "t",
        default: 0,
        desc: "Time in seconds to capture",
        type: "number",
      })
      // General configuration
      .group(["browser-executable", "config", "help"], "General options")
      .option("browser-executable", BROWSER_EXECUTABLE)
      // Frame formatting
      .group(
        ["color-scheme", "height", "image-format", "quality", "width"],
        "Frame formatting",
      )
      .option("color-scheme", {
        choices: ["light", "dark"] as const,
        default: "light" as "light" | "dark",
        desc: "Color scheme",
      })
      .option("height", {
        alias: "h",
        default: 720,
        desc: "Screenshot height",
      })
      .option("image-format", {
        alias: "F",
        choices: ["jpeg", "png"] as const,
        default: "png" as "jpeg" | "png",
        desc: "Image format for screenshot",
      })
      .option("quality", {
        alias: "q",
        default: 80,
        desc: 'Quality for images. Only applies when --image-format is "jpeg"',
      })
      .option("width", {
        alias: "w",
        default: 1280,
        desc: "Screenshot width",
      })
      .version(false),
  command: "screenshot",
  describe: "Capture a screenshot from a Liqvid video",
  handler: async (argv) => {
    const { screenshot: renderScreenshot } = await import(
      "@liqvid/renderer/screenshot"
    );
    // biome-ignore lint/suspicious/noExplicitAny: argv is properly typed by yargs builder
    await renderScreenshot(argv as any);
    process.exit(0);
  },
};
