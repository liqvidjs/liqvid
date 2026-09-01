import path from "node:path";

import { formatTime, parseTime } from "@liqvid/utils";
import { Effect, FileSystem } from "effect";
import type { AbsoluteFile } from "effect-paths";

import { Progress } from "../index.mts";
import type { ImageFormat } from "../types.mts";
import { ffmpegExists, getEnsureChrome } from "../utils/binaries.mts";
import { captureRange } from "../utils/capture.mts";
import { validateConcurrency } from "../utils/concurrency.mts";
import { getPages } from "../utils/connect.mts";
import { Pool } from "../utils/pool.mts";
import { stitch } from "../utils/stitch.mts";

import { renderAudio } from "./render-audio.mts";

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
}: Omit<
  Parameters<typeof assembleVideo>[0],
  "audioFile" | "framesDir" | "padLen"
> & {
  browserExecutable: AbsoluteFile;
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
    const total = sequence ? 2 : 4;

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

    // audio file (rendered in parallel with frames)
    const audioFile = sequence
      ? undefined
      : yield* fs.makeTempFile({ prefix: "liqvid.audio", suffix: ".wav" });

    // Capture frames (in parallel with audio rendering)
    const captureFrames = Effect.scoped(
      Effect.gen(function* () {
        const pages = yield* getPages({
          colorScheme,
          concurrency,
          executablePath,
          height,
          renderMode: "video",
          url,
          width,
        });

        yield* Effect.log(`acquired ${pages.length} players`);
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

        /* capture frames */
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

        yield* Effect.logDebug("finished capturing frames");

        return {
          padLen,
          realDuration,
        };
      }),
    ).pipe(Effect.withLogSpan("capture-frames"));

    // Render audio in parallel (only when not outputting a sequence)
    // Returns the audio file path on success, undefined if audio rendering fails
    // (e.g., video has no audio sources)
    const renderAudioTask =
      !sequence && audioFile
        ? Effect.gen(function* () {
            yield* Effect.log(`(${step++}/${total}) Rendering audio...`);
            yield* renderAudio({
              browserExecutable: executablePath,
              output: audioFile,
              url,
            });
            yield* Effect.logDebug("finished rendering audio");
            return audioFile as string | undefined;
          }).pipe(
            Effect.catch(() =>
              Effect.gen(function* () {
                yield* Effect.logWarning(
                  "Audio rendering failed, continuing with silent video",
                );
                // Clean up the temp audio file since we won't use it
                yield* fs.remove(audioFile).pipe(Effect.ignore);
                return undefined;
              }),
            ),
            Effect.withLogSpan("render-audio"),
          )
        : Effect.succeed(undefined as string | undefined);

    // Run frame capture and audio rendering in parallel
    const [{ padLen, realDuration }, renderedAudioFile] = yield* Effect.all(
      [captureFrames, renderAudioTask],
      { concurrency: "unbounded" },
    );

    yield* Effect.logDebug({ padLen, realDuration });

    // stitch them
    if (!sequence) {
      yield* Effect.log(`(${step++}/${total}) Assembling video...`);
      yield* assembleVideo({
        audioFile: renderedAudioFile,
        duration: realDuration,
        framesDir,
        padLen,
        ...o,
      });

      // clean up tmp files
      yield* Effect.log("Cleaning up...");
      yield* Effect.all([
        fs.remove(framesDir, { recursive: true }),
        renderedAudioFile ? fs.remove(renderedAudioFile) : Effect.void,
      ]);
    }

    // done
    yield* Effect.log("Done!");
  }).pipe(
    Effect.withLogSpan("solidify"),
    Effect.annotateLogs({ colorScheme, height, sequence, url, width }),
  );
}

/**
Assemble frames into a video.
*/
const assembleVideo = Effect.fn("assembleVideo")(function* ({
  padLen,
  ...o // passthrough parameters
}: Omit<Parameters<typeof stitch>[0], "pattern" | "signal"> & {
  imageFormat: ImageFormat;
  padLen: number;
}) {
  // progress bar
  const progress = yield* Progress;
  const stitchingBar = new progress.SingleBar({
    etaBuffer: 50,
    formatValue: formatTime,
  });

  stitchingBar.start(o.duration * 1_000, 0);

  yield* Effect.promise((signal) => {
    // ffmpeg stitch job
    const job = stitch({
      pattern: `%0${padLen}d.${o.imageFormat}`,
      signal,
      ...o,
    });

    // parse ffmpeg progress
    job.stderr.on("data", (msg: Buffer) => {
      const $_ = msg.toString().match(/time=(\d+:\d+:\d+.\d+)/);
      if ($_) {
        stitchingBar.update(parseTime($_[1]!));
      }
    });

    return job;
  });

  stitchingBar.stop();
});
