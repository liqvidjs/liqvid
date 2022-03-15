import execa from "execa";
import fs, {promises as fsp} from "fs";
import path from "path";
import cliProgress from "cli-progress";
import {ffmpegExists} from "../utils/binaries";
import {formatTime, parseTime} from "@liqvid/utils/time";

/** Repair and convert audio files */
export async function convert({filename}: {
  filename?: string;
}) {
  // check that ffmpeg exists
  if (!(await ffmpegExists())) {
    console.error("ffmpeg must be installed and in your PATH. Download it from");
    console.error("https://ffmpeg.org/download.html");
    process.exit(1);
  }

  // check that audio file exists
  if (!fs.existsSync(filename)) {
    console.error(`Audio file ${filename} not found`);
    process.exit(1);
  }

  /* actual conversion */
  const basename = path.basename(filename, ".webm");
  const dirname = path.dirname(filename);

  // fix browser recording
  console.log("(1/2) Fixing webm...");
  await fixWebm(filename, path.join(dirname, basename + "-fixed.webm"));

  // make available in mp4
  console.log("(2/2) Converting to mp4...");
  await convertMp4(filename, path.join(dirname, basename + ".mp4"));

  console.log("Done!");
}

/** Reencode webm */
async function fixWebm(src: string, tmp: string) {
  const duration = await getDuration(src);

  // progress bar
  const bar = new cliProgress.SingleBar({
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
  

  /* ffmpeg job */
  const job = execa("ffmpeg", ["-y", "-i", src, "-strict", "-2", tmp]);
  
  // parse ffmpeg progress
  job.stderr.on("data", (msg: Buffer) => {
    const $_ = msg.toString().match(/time=(\d+:\d+:\d+.\d+)/);
    if ($_) {
      bar.update(parseTime($_[1]));
    }
  });
  
  bar.start(duration, 0);
  await job;
  bar.stop();

  // rename file
  await fsp.rename(tmp, src);
}

/** Make available as mp4 */
async function convertMp4(src: string, dest: string) {
  const duration = await getDuration(src);

  // progress bar
  const bar = new cliProgress.SingleBar({
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

  /* ffmpeg job */
  const job = execa("ffmpeg", ["-y", "-i", src, dest]);
  
  // parse ffmpeg progress
  job.stderr.on("data", (msg: Buffer) => {
    const $_ = msg.toString().match(/time=(\d+:\d+:\d+.\d+)/);
    if ($_) {
      bar.update(parseTime($_[1]));
    }
  });
  
  bar.start(duration, 0);
  await job;
  bar.stop();
}

/**
 * Get duration in milliseconds of audio file
 * @param filename Path to audio file
 * @returns Duration in milliseconds
 */
async function getDuration(filename: string) {
  const res = await execa("ffprobe", ["-i", filename, "-show_entries", "format=duration", "-v", "quiet", "-of", "csv=p=0"]);
  return parseFloat(res.stdout) * 1000;
}
