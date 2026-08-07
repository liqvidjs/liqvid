import * as path from "node:path";

import { Effect, FileSystem } from "effect";
import type { AbsoluteFile } from "effect-paths";
import type * as Puppeteer from "puppeteer-core";

import type { ImageFormat } from "../types.mts";
import { getEnsureChrome } from "../utils/binaries.mts";
import { capture } from "../utils/capture.mts";
import { connect } from "../utils/connect.mts";
import { acquireBrowser } from "../utils/effect.mts";

export type ScreenshotOptions = {
  /** Path to Chrome/ium executable */
  browserExecutable?: string;

  /** Color scheme */
  colorScheme?: "light" | "dark";

  /** Screenshot height */
  height: number;

  /**
   * Image format
   * @deprecated use `screenshotOptions.type` instead
   */
  imageFormat?: ImageFormat;

  /** Output path for the screenshot */
  output: AbsoluteFile;

  /**
   * Image quality (for JPEG)
   * @deprecated use `screenshotOptions.quality` instead
   */
  quality?: number;

  /** Time in seconds to capture */
  time: number;

  /** URL of the Liqvid player */
  url: string;

  /** Screenshot width */
  width: number;

  /** Additional options for Puppeteer screenshot */
  screenshotOptions?: Exclude<
    Puppeteer.ScreenshotOptions,
    // legacy
    "path" | "quality" | "type"
  >;
};

export interface ScreenshotResult {
  /** Height of the screenshot */
  height: number;
  /** Path to the saved screenshot */
  path: string;

  /** Width of the screenshot */
  width: number;
}

/**
 * Capture a single screenshot from a Liqvid player.
 */
export function screenshot(options: ScreenshotOptions) {
  return Effect.gen(function* () {
    const {
      browserExecutable,
      colorScheme = "light",
      height,
      output,
      time,
      url,
      width,
      screenshotOptions,
    } = options;

    if (screenshotOptions && screenshotOptions.type !== "jpeg") {
      screenshotOptions.quality = undefined;
    }

    // Find browser executable
    const executablePath = yield* Effect.promise(() =>
      getEnsureChrome(browserExecutable ?? ""),
    );

    // Launch browser
    const browser = yield* acquireBrowser({
      args: [process.platform === "linux" ? "--single-process" : ""].filter(
        Boolean,
      ) as string[],
      executablePath,
      headless: process.env.HEADLESS !== "false",
      timeout: 0,
    });

    // Connect to the page
    const page = yield* connect({
      browser,
      colorScheme,
      height,
      renderMode: "screenshot",
      url,
      width,
    });

    // Create CDP session for capture utility
    // (page as any).client = yield* Effect.promise(() => page.createCDPSession());

    const fs = yield* FileSystem.FileSystem;

    // Ensure output directory exists
    yield* fs.makeDirectory(path.dirname(output), { recursive: true });

    // Capture screenshot using the shared capture utility
    yield* Effect.promise(() =>
      capture({
        page,
        path: output,
        time,
        ...screenshotOptions,
      }),
    );

    return {
      height,
      path: output,
      width,
    };
  }).pipe(Effect.scoped);
}
