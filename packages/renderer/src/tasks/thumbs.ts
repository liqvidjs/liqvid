import cliProgress from "cli-progress";
import {promises as fsp} from "fs";
import jimp from "jimp";
import os from "os";
import path from "path";
import puppeteer from "puppeteer-core";

import {ImageFormat} from "../types";

import {getEnsureChrome} from "../utils/binaries";
import {captureRange} from "../utils/capture";
import {validateConcurrency} from "../utils/concurrency";
import {getPages} from "../utils/connect";
import {Pool} from "../utils/pool";

/**
Create thumbnail sheets for a Liqvid video.
*/
export async function thumbs({
  browserExecutable,
  browserHeight,
  browserWidth,
  colorScheme = "light",
  cols,
  concurrency,
  frequency,
  height,
  imageFormat,
  output,
  quality,
  rows,
  url,
  width
}: {
  browserExecutable: string;
  browserHeight: number;
  browserWidth: number;
  colorScheme: "light" | "dark";
  cols: number;
  concurrency: number;
  frequency: number;
  height: number;
  imageFormat: ImageFormat;
  output: string;
  quality: number;
  rows: number;
  url: string;
  width: number;
}) {
  let step = 1;
  const total = 3;

  // validation
  const executablePath = await getEnsureChrome(browserExecutable);

  if (path.extname(output) !== `.${imageFormat}`) {
    console.error(`Error: File pattern '${output}' does not match format '${imageFormat}'.`);
    process.exit(1);
  }
  
  concurrency = validateConcurrency(concurrency);

  // browserHeight / browserWidth default to height/width
  browserHeight ??= height;
  browserWidth ??= width;

  // make directories
  const [tmpDir] = await Promise.all([
    fsp.mkdtemp(path.join(os.tmpdir(), "liqvid.thumbs")),
    fsp.mkdir(path.dirname(output), {recursive: true})
  ]);

  // pool of puppeteer instances
  console.log(`(${step++}/${total}) Connecting to players...`);
  const pages = await getPages({
    colorScheme,
    concurrency, url,
    executablePath,
    height: browserHeight, width: browserWidth
  });
  const pool = new Pool(pages);
  for (const page of pages) {
    (page as any).client = await page.target().createCDPSession();
  }

  // calculate how many thumbs
  const duration = await pages[0].evaluate(() => {
    return player.playback.duration;
  });

  const numThumbs = Math.ceil(duration / frequency / 1000);

  // grab thumbs and assemble them
  console.log(`(${step++}/${total}) Capturing thumbs...`);
  await captureRange({
    count: numThumbs,
    filename: i => path.join(tmpDir, `${i}.${imageFormat}`),
    imageFormat,
    pool,
    time: i => i * frequency * 1000
  });

  // close chrome instances
  pages[0].browser().close();

  console.log(`(${step++}/${total}) Assembling sheets...`);
  await assembleSheets({cols, height, imageFormat, numThumbs, output, pool, quality, rows, tmpDir, width});

  // clean up tmp files
  console.log("Cleaning up...");
  await fsp.rm(tmpDir, {recursive: true});

  // done
  console.log("Done!");
}

/**
Assemble thumb screenshots into sheets.
*/
async function assembleSheets({
  cols,
  height,
  imageFormat,
  numThumbs,
  output,
  pool,
  quality,
  rows,
  tmpDir,
  width
}: {
  cols: number;
  height: number;
  imageFormat: ImageFormat;
  numThumbs: number;
  output: string;
  pool: Pool<puppeteer.Page>;
  quality: number;
  rows: number;
  tmpDir: string;
  width: number;
}) {
  const numSheets = Math.ceil(numThumbs / cols / rows);

  // progress bar
  const sheetsBar = new cliProgress.SingleBar({
    autopadding: true,
    clearOnComplete: true,
    format: "{bar} {percentage}% | ETA: {eta_formatted} | {value}/{total}",
    hideCursor: true
  }, cliProgress.Presets.shades_classic);

  sheetsBar.start(numThumbs, 0);

  await Promise.all(
    new Array(numSheets)
    .fill(null)
    .map(async (_, sheetNum) => {

      // get available puppeteer instance
      const page = await pool.acquire();

      const sheet = await new jimp(cols * width, rows * height);

      // blit thumbs into here
      await Promise.all(
        new Array(cols * rows)
        .fill(null)
        .map(async (_, i) => {
          const index = sheetNum * cols * rows + i;
          if (index >= numThumbs) return;

          const thumb = await jimp.read(path.join(tmpDir, `${index}.${imageFormat}`));
          if (imageFormat === "jpeg") {
            thumb.quality(quality);
          }
          await thumb.resize(width, height);
          await sheet.blit(thumb, (i % cols) * width, Math.floor(i / rows) * height);
          sheetsBar.increment();
        })
      );

      await sheet.writeAsync(output.replace("%s", sheetNum.toString()));

      // release puppeteer instance
      pool.release(page);
    })
  );
  sheetsBar.stop();
}
