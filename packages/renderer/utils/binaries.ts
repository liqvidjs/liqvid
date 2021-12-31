import execa from "execa";
import fs from "fs";
import os from "os";
// sillyness
import Puppeteer from "puppeteer-core";

const puppeteer = Puppeteer as unknown as Puppeteer.PuppeteerNode;

export async function ffmpegExists() {
  const locate = os.platform() === "win32" ? "where" : "which";
  try {
    await execa(locate, ["ffmpeg"]);
    return true;
  } catch (e) {
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
  if (systemChrome)
    return systemChrome;

  // puppeteer preinstalled
  const preinstalledChrome = puppeteer.executablePath();
  if (fs.existsSync(preinstalledChrome))
    return preinstalledChrome;

  // puppeteer install
  console.log("No Chrome installation found. Downloading one from the internet...");
  const browserFetcher = puppeteer.createBrowserFetcher({});
  const revisionInfo = await browserFetcher.download(puppeteer._preferredRevision);
  return revisionInfo.executablePath;
}

/**
Look for Chrome/ium in standard locations across platforms.
*/
async function findChromeByPlatform() {
  switch (process.platform) {
  case "win32":
    return [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    ].find(location => fs.existsSync(location));
  case "darwin":
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    ].find(location => fs.existsSync(location));
  default:
    try {
      const {stdout} = await execa("which", ["google-chrome", "chromium", "chromium-browser"]);
      return stdout.split("\n")[0];
    } catch (e) {
      const {stdout} = e;
      return stdout.split("\n").filter(Boolean)[0];
    }
  }
}
