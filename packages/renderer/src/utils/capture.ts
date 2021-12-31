import cliProgress from "cli-progress";
import type puppeteer from "puppeteer-core";

import type {Pool} from "./pool";
import {ImageFormat} from "../types";

import {promises as fsp} from "fs";

export async function capture({
  page,
  path,
  quality,
  time,
  type
}: {
  page: puppeteer.Page;
  path: string;
  quality?: number | undefined;
  time: number;
  type: ImageFormat;
}) {
  await page.evaluate((time) => {
    player.playback.seek(time);
  }, time);

  const client = (page as any).client as puppeteer.CDPSession;
  const options = {
    format: type,
    quality: type === "jpeg" ? quality : undefined
  };

  const {data} = await client.send('Page.captureScreenshot', options);
  const base64Data = data.replace(/^data:image\/png;base64,/, "");

  return fsp.writeFile(path, base64Data, 'base64');

  return page.screenshot({
    omitBackground: type === "png",
    path,
    // puppeteer will throw error if quality is passed for png
    quality: type === "jpeg" ? quality : undefined,
    type
  });
}

/**
Capture a range of frames.
*/
export async function captureRange({
  count,
  filename,
  imageFormat,
  pool,
  quality,
  time
}: {
  count: number;
  filename: (i: number) => string;
  imageFormat: ImageFormat;
  pool: Pool<puppeteer.Page>;
  quality?: number | undefined;
  time: (i: number) => number;
}) {
  // progress bar
  const captureBar = new cliProgress.SingleBar({
    autopadding: true,
    clearOnComplete: true,
    format: "{bar} {percentage}% | ETA: {eta_formatted} | {value}/{total}",
    hideCursor: true
  }, cliProgress.Presets.shades_classic);
  captureBar.start(count, 0);

  // grab the thumbs
  await Promise.all(
    new Array(count)
    .fill(null)
    .map(async (_, i) => {
      // get available puppeteer instance
      const page = await pool.acquire();

      // capture frame
      await capture({
        page,
        time: time(i),
        type: imageFormat,
        path: filename(i),
        quality
      });
      captureBar.increment();

      // release puppeteer instance
      pool.release(page);
    })
  );

  captureBar.stop();
}
