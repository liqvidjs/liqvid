import type { AbsoluteFile } from "effect-paths";
import puppeteer from "puppeteer-core";

import { getEnsureChrome } from "../utils/binaries.mts";

export interface DebugOptions {
  /** Path to Chrome/ium executable (optional, will auto-detect) */
  browserExecutable?: AbsoluteFile;

  /** URL to open */
  url: string;
}

/**
 * Open the given URL in a visible (non-headless) Puppeteer browser.
 *
 * The browser stays open until it is closed manually; the returned promise
 * resolves once the browser disconnects.
 */
export async function debug(options: DebugOptions): Promise<void> {
  const { browserExecutable, url } = options;

  // Find browser executable
  const executablePath = await getEnsureChrome(browserExecutable);

  // Launch a visible browser
  const browser = await puppeteer.launch({
    acceptInsecureCerts: true,
    args: [process.platform === "linux" ? "--single-process" : ""].filter(
      Boolean,
    ) as string[],
    browser: "chrome",
    executablePath,
    headless: false,
    timeout: 0,
  });

  const [page] = await browser.pages();
  await (page ?? (await browser.newPage())).goto(url);

  // Keep the process alive until the browser is closed.
  await new Promise<void>((resolve) => {
    browser.on("disconnected", () => resolve());
  });
}
