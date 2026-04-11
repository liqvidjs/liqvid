import { promises as fsp } from "node:fs";
import * as path from "node:path";

import puppeteer from "puppeteer-core";

import type { ImageFormat } from "../types.js";
import { getEnsureChrome } from "../utils/binaries.mts";
import { callPlayerApi, connect } from "../utils/connect.mts";

export interface ScreenshotOptions {
  /** Path to Chrome/ium executable */
  browserExecutable?: string;
  /** Color scheme */
  colorScheme?: "light" | "dark";
  /** Screenshot height */
  height: number;
  /** Image format */
  imageFormat?: ImageFormat;
  /** Output path for the screenshot */
  output: string;
  /** Image quality (for JPEG) */
  quality?: number;
  /** Time in seconds to capture */
  time: number;
  /** URL of the Liqvid player */
  url: string;
  /** Screenshot width */
  width: number;
}

export interface ScreenshotResult {
  /** Path to the saved screenshot */
  path: string;
  /** Width of the screenshot */
  width: number;
  /** Height of the screenshot */
  height: number;
}

/**
 * Capture a single screenshot from a Liqvid player.
 */
export async function screenshot(
  options: ScreenshotOptions,
): Promise<ScreenshotResult> {
  const {
    browserExecutable,
    colorScheme = "light",
    height,
    imageFormat = "png",
    output,
    quality = 80,
    time,
    url,
    width,
  } = options;

  // Find browser executable
  const executablePath = await getEnsureChrome(browserExecutable ?? "");

  // Launch browser
  const browser = await puppeteer.launch({
    args: [process.platform === "linux" ? "--single-process" : ""].filter(
      Boolean,
    ) as string[],
    executablePath,
    timeout: 0,
  });

  try {
    // Connect to the page
    const page = await connect({
      browser,
      height,
      url,
      width,
    });

    await Promise.all([
      // Set color scheme
      callPlayerApi(page, "setColorScheme", [colorScheme]),

      // Seek to the specified time
      callPlayerApi(page, "seekTo", [time]),
    ]);

    // Wait a moment for rendering to settle
    // TODO: this will slow things down
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Ensure output directory exists
    await fsp.mkdir(path.dirname(output), { recursive: true });

    // Capture screenshot
    await page.screenshot({
      omitBackground: imageFormat === "png",
      path: output,
      quality: imageFormat === "jpeg" ? quality : undefined,
      type: imageFormat,
    });

    return {
      height,
      path: output,
      width,
    };
  } finally {
    await browser.close();
  }
}
