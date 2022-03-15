import cliProgress from "cli-progress";
import fs, {promises as fsp} from "fs";
import os from "os";
import path from "path";

import {ffmpegExists, getEnsureChrome} from "../utils/binaries";
import {captureRange} from "../utils/capture";
import {validateConcurrency} from "../utils/concurrency";
import {getPages} from "../utils/connect";
import {Pool} from "../utils/pool";
import {stitch} from "../utils/stitch";
import {formatTime, parseTime} from "@liqvid/utils/time";

import {ImageFormat} from "../types";

/**
  Render an interactive ("liquid") video as a static ("solid") video.
*/
export async function solidify({
  browserExecutable,
  colorScheme = "light",
  concurrency,
  duration,
  end,
  height,
  quality,
  sequence,
  url,
  width,
  ...o // passthrough parameters
}: Parameters<typeof assembleVideo>[0] & {
  browserExecutable: string;
  colorScheme: "light" | "dark";
  concurrency: number;
  duration: number;
  end: number;
  height: number;
  quality: number;
  sequence: boolean;
  url: string;
  width: number;
}) {
  let step = 1;
  const total = sequence ? 2 : 3;

  /* validation */
  // make sure chrome exists, or download it
  const executablePath = await getEnsureChrome(browserExecutable);

  // check that ffmpeg exists
  if (!sequence && !(await ffmpegExists())) {
    console.error("ffmpeg must be installed and in your PATH. Download it from");
    console.error("https://ffmpeg.org/download.html");
    process.exit(1);
  }

  // check that audio file exists
  if (o.audioFile && !fs.existsSync(o.audioFile)) {
    console.error(`Audio file ${o.audioFile} not found`);
    process.exit(1);
  }

  // validate start/end time
  if (end <= o.start) {
    console.error("End time cannot be before start time");
    process.exit(1);
  }

  // bound concurrency
  concurrency = validateConcurrency(concurrency);

  // make sure output directory exists
  if (sequence) {
    await fsp.mkdir(o.output, {recursive: true});
  }

  /* calculate other values */
  // pool of puppeteer instances
  console.log(`(${step++}/${total}) Connecting to players...`);
  const pages = await getPages({
    colorScheme, concurrency, executablePath, url, height, width,
  });
  for (const page of pages) {
    (page as any).client = await page.target().createCDPSession();
  }
  const pool = new Pool(pages);

  // get duration
  const totalDuration = await pages[0].evaluate(() => {
    return player.playback.duration;
  });

  if (o.start >= totalDuration) {
    console.error("Start cannot be after video endtime");
    process.exit(1);
  }

  const realDuration = (() => {
    if (typeof duration === "number") {
      return Math.min(totalDuration - o.start, duration);
    } else if (typeof end === "number") {
      return Math.min(end - o.start, totalDuration);
    }
    return totalDuration - o.start;
  })();

  // frames dir
  const framesDir =
    sequence ?
      o.output :
      await fsp.mkdtemp(path.join(os.tmpdir(), "liqvid.render"));

  // calculate how many frames
  const count = Math.ceil(o.fps * realDuration / 1000);
  const padLen = String(count - 1).length;

  /* capture and assemble */
  // capture frames
  console.log(`(${step++}/${total}) Capturing frames...`);
  await captureRange({
    count,
    filename: i => path.join(
      framesDir,
      String(i).padStart(padLen, "0") + `.${o.imageFormat}`
    ),
    imageFormat: o.imageFormat,
    pool,
    quality,
    time: i => o.start + i * 1000 / o.fps
  });

  // close chrome instances
  for (const page of pages) {
    page.close();
  }

  // stitch them
  if (!sequence) {
    console.log(`(${step++}/${total}) Assembling video...`);
    await assembleVideo({
      duration: realDuration,
      framesDir,
      padLen,
      ...o
    });

    // clean up tmp files
    console.log("Cleaning up...");
    await fsp.rm(framesDir, {recursive: true});
  }

  // done
  console.log("Done!");
}

/**
Assemble frames into a video.
*/
async function assembleVideo({
  padLen,
  ...o // passthrough parameters
}: Parameters<typeof stitch>[0] & {
  imageFormat: ImageFormat;
  padLen: number;
}) {
  // progress bar
  const stitchingBar = new cliProgress.SingleBar({
    autopadding: true,
    clearOnComplete: true,
    etaBuffer: 50,
    format: "{bar} {percentage}% | ETA: {eta_formatted} | {value}/{total}",
    formatValue: (v, options, type) => {
      if (type === "value" || type === "total") {
        return formatTime(v);
      }
      return cliProgress.Format.ValueFormat(v, options, type);
    },
    hideCursor: true
  }, cliProgress.Presets.shades_classic);

  stitchingBar.start(o.duration, 0);
  
  // ffmpeg stitch job
  const job = stitch({
    pattern: `%0${padLen}d.${o.imageFormat}`,
    ...o
  });

  // parse ffmpeg progress
  job.stderr.on("data", (msg: Buffer) => {
    const $_ = msg.toString().match(/time=(\d+:\d+:\d+.\d+)/);
    if ($_) {
      stitchingBar.update(parseTime($_[1]));
    }
  });

  await job;

  stitchingBar.stop();
}
