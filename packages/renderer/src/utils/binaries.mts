import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  Browser,
  BrowserTag,
  detectBrowserPlatform,
  getInstalledBrowsers,
  install,
  resolveBuildId,
} from "@puppeteer/browsers";
import { ExecaError, execa } from "execa";

/** Default cache directory for browser downloads */
const CACHE_DIR = path.join(os.homedir(), ".cache", "puppeteer");

export async function ffmpegExists() {
  const locate = os.platform() === "win32" ? "where" : "which";
  try {
    await execa(locate, ["ffmpeg"]);
    return true;
  } catch (_e) {
    return false;
  }
}

/**
Ensure that a Chrome/ium executable exists on the machine, and return the path to it.
*/
export async function getEnsureChrome(userChrome: string) {
  // user-supplied path
  if (userChrome) {
    if (!fs.existsSync(userChrome)) {
      console.warn(`Could not find browser executable at ${userChrome}`);
    } else {
      return userChrome;
    }
  }

  // typical install
  const systemChrome = await findChromeByPlatform();
  if (systemChrome) return systemChrome;

  // check for already installed browser in cache
  const platform = detectBrowserPlatform();
  if (!platform) {
    throw new Error("Unable to detect browser platform");
  }

  const installedBrowsers = await getInstalledBrowsers({ cacheDir: CACHE_DIR });
  const installedChrome = installedBrowsers.find(
    (b) => b.browser === Browser.CHROME,
  );
  if (installedChrome) {
    return installedChrome.executablePath;
  }

  // download and install Chrome
  console.log(
    "No Chrome installation found. Downloading one from the internet...",
  );

  const buildId = await resolveBuildId(
    Browser.CHROME,
    platform,
    BrowserTag.STABLE,
  );
  const installedBrowser = await install({
    browser: Browser.CHROME,
    buildId,
    cacheDir: CACHE_DIR,
    downloadProgressCallback: "default",
  });

  return installedBrowser.executablePath;
}

/**
Look for Chrome/ium in standard locations across platforms.
*/
async function findChromeByPlatform() {
  switch (process.platform) {
    case "win32":
      return [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      ].find((location) => fs.existsSync(location));
    case "darwin":
      return [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      ].find((location) => fs.existsSync(location));
    default:
      try {
        const { stdout } = await execa("which", [
          "google-chrome",
          "chromium",
          "chromium-browser",
        ]);
        return stdout.split("\n")[0];
      } catch (e) {
        if (e instanceof ExecaError) {
          const { stdout } = e;
          return (stdout as unknown as string).split("\n").filter(Boolean)[0];
        }
        throw e;
      }
  }
}
