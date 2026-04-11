import type { CommandModule } from "yargs";

import {
  BROWSER_EXECUTABLE,
  CONCURRENCY,
  DEFAULT_CONFIG,
  parseConfig,
} from "./config.mts";

/**
 * Image format for thumbnails.
 */
export type ImageFormat = "jpeg" | "png";

/**
 * Options for generating thumbnail sheets.
 */
export interface ThumbsOptions {
  /** Path to browser executable (optional, will auto-detect) */
  browserExecutable?: string;

  /** Height of screenshot before resizing */
  browserHeight?: number;

  /** Width of screenshot before resizing */
  browserWidth?: number;

  /** Color scheme: light or dark */
  colorScheme?: "light" | "dark";

  /** Number of columns per sheet */
  cols?: number;

  /** Number of concurrent browser instances */
  concurrency?: number;

  /** Seconds between screenshots */
  frequency?: number;

  /** Height of each thumbnail */
  height?: number;

  /** Image format: jpeg or png */
  imageFormat?: ImageFormat;

  /** Pattern for output filenames (must include %s for sheet number) */
  output: string;

  /** Quality for JPEG images (0-100) */
  quality?: number;

  /** Number of rows per sheet */
  rows?: number;

  /** URL of video to generate thumbs for */
  url: string;

  /** Width of each thumbnail */
  width?: number;
}

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
export async function generateThumbs(
  options: ThumbsOptions,
): Promise<ThumbsResult> {
  const path = await import("node:path");
  const fsp = await import("node:fs/promises");

  const { thumbs: renderThumbs } = await import("@liqvid/renderer/thumbs");

  // Apply defaults
  const cols = options.cols ?? 5;
  const rows = options.rows ?? 5;
  const frequency = options.frequency ?? 4;
  const width = options.width ?? 160;
  const height = options.height ?? 100;
  const imageFormat = options.imageFormat ?? "jpeg";
  const colorScheme = options.colorScheme ?? "light";
  const quality = options.quality ?? 80;
  const concurrency = options.concurrency ?? 1;

  await renderThumbs({
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

  try {
    const files = await fsp.readdir(outputDir);
    const sheets = files.filter(
      (f) => /^\d+\.(jpeg|png)$/.test(f) && f.endsWith(ext),
    );
    return {
      numSheets: sheets.length,
      output: options.output,
    };
  } catch {
    // Output directory doesn't exist or other error
    return {
      numSheets: 0,
      output: options.output,
    };
  }
}

export const thumbs: CommandModule = {
  builder: (yargs) =>
    yargs
      .config("config", parseConfig("thumbs"))
      .default("config", DEFAULT_CONFIG)
      .example([
        ["liqvid thumbs"],
        [
          "liqvid thumbs -u http://localhost:8080/dist/ -o ./dist/thumbs/%s.jpeg",
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
        default: "http://localhost:3000/dist/",
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
    // biome-ignore lint/suspicious/noExplicitAny: argv is properly typed by yargs builder
    await renderThumbs(argv as any);
    process.exit(0);
  },
};
