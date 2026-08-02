import path from "node:path";

import { formatTime, parseTime } from "@liqvid/utils";
import { Effect, FileSystem } from "effect";

import { Progress } from "../index.mts";
import type { ImageFormat } from "../types.mts";
import { ffmpegExists, getEnsureChrome } from "../utils/binaries.mts";
import { captureRange } from "../utils/capture.mts";
import { validateConcurrency } from "../utils/concurrency.mts";
import { getPages } from "../utils/connect.mts";
import { Pool } from "../utils/pool.mts";
import { stitch } from "../utils/stitch.mts";

/**
  Render an interactive ("liquid") video as a static ("solid") video.
*/
export function solidify({
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
  start = 0,
  ...o // passthrough parameters
}: Omit<Parameters<typeof assembleVideo>[0], "framesDir" | "padLen"> & {
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
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    let step = 1;
    const total = sequence ? 2 : 3;

    /* validation */
    // make sure chrome exists, or download it
    const executablePath = yield* Effect.promise(() =>
      getEnsureChrome(browserExecutable),
    );

    // check that ffmpeg exists
    if (!sequence && !(yield* Effect.promise(ffmpegExists))) {
      yield* Effect.logError(
        "ffmpeg must be installed and in your PATH. Download it from",
      );
      yield* Effect.logError("https://ffmpeg.org/download.html");
      return yield* Effect.die("ffmpeg not found");
    }

    // check that audio file exists
    if (o.audioFile && !(yield* fs.exists(o.audioFile))) {
      return yield* Effect.die(`audio file ${o.audioFile} not found`);
    }

    // validate start/end time
    if (end <= start) {
      return yield* Effect.die("end time cannot be before start time");
    }

    // bound concurrency
    concurrency = validateConcurrency(concurrency);

    // make sure output directory exists
    if (sequence) {
      yield* fs.makeDirectory(o.output, { recursive: true });
    }

    /* calculate other values */
    // pool of puppeteer instances
    yield* Effect.log(`(${step++}/${total}) Connecting to players...`);

    // frames dir
    const framesDir = sequence
      ? o.output
      : yield* fs.makeTempDirectory({ prefix: "liqvid.render" });

    const { padLen, realDuration } = yield* Effect.acquireUseRelease(
      getPages({
        colorScheme,
        concurrency,
        executablePath,
        height,
        renderMode: "video",
        url,
        width,
      }),
      (pages) =>
        Effect.gen(function* () {
          yield* Effect.log(`acquired ${pages.length} players`);
          // for (const page of pages) {
          //   (page as any).client = yield* Effect.promise(() =>
          //     page.createCDPSession(),
          //   );
          // }
          const pool = new Pool(pages);

          // get duration
          const totalDuration = yield* Effect.promise(() =>
            pages[0]!.evaluate(() => {
              return player.playback.duration;
            }),
          );

          if (start >= totalDuration) {
            return yield* Effect.die("start cannot be after video endtime");
          }

          const realDuration = (() => {
            if (typeof duration === "number") {
              return Math.min(totalDuration - start, duration);
            } else if (typeof end === "number") {
              return Math.min(end - start, totalDuration);
            }
            return totalDuration - start;
          })();

          // calculate how many frames
          const count = Math.ceil(o.fps * realDuration);
          const padLen = String(count - 1).length;

          /* capture and assemble */
          // capture frames
          yield* Effect.log(`(${step++}/${total}) Capturing frames...`);
          yield* captureRange({
            count,
            filename: (i) =>
              path.join(
                framesDir,
                String(i).padStart(padLen, "0") + `.${o.imageFormat}`,
              ),
            imageFormat: o.imageFormat,
            pool,
            quality,
            time: (i) => start + i / o.fps,
          });

          return {
            padLen,
            realDuration,
          };
        }),

      // close chrome instances
      (pages) =>
        Effect.all(
          pages.map((page) =>
            Effect.promise(() => page.close({ runBeforeUnload: false })),
          ),
        ),
    ).pipe(Effect.scoped);

    // stitch them
    if (!sequence) {
      yield* Effect.log(`(${step++}/${total}) Assembling video...`);
      yield* assembleVideo({
        duration: realDuration,
        framesDir,
        padLen,
        ...o,
      });

      // clean up tmp files
      yield* Effect.log("Cleaning up...");
      yield* fs.remove(framesDir, { recursive: true });
    }

    // done
    yield* Effect.log("Done!");
  });
}

/**
Assemble frames into a video.
*/
function assembleVideo({
  padLen,
  ...o // passthrough parameters
}: Omit<Parameters<typeof stitch>[0], "pattern"> & {
  imageFormat: ImageFormat;
  padLen: number;
}) {
  return Effect.gen(function* () {
    // progress bar
    const progress = yield* Progress;
    const stitchingBar = new progress.SingleBar({
      etaBuffer: 50,
      formatValue: formatTime,
    });

    stitchingBar.start(o.duration, 0);

    // ffmpeg stitch job
    const job = stitch({
      pattern: `%0${padLen}d.${o.imageFormat}`,
      ...o,
    });

    // parse ffmpeg progress
    job.stderr.on("data", (msg: Buffer) => {
      const $_ = msg.toString().match(/time=(\d+:\d+:\d+.\d+)/);
      if ($_) {
        stitchingBar.update(parseTime($_[1]!));
      }
    });

    yield* Effect.promise(() => job);

    stitchingBar.stop();
  });
}
