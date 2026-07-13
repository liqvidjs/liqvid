import path from "node:path";

import { Effect, FileSystem } from "effect";
import jimp from "jimp";
import type * as puppeteer from "puppeteer-core";

import type { ImageFormat } from "../types.mts";
import { getEnsureChrome } from "../utils/binaries.mts";
import { captureRange } from "../utils/capture.mts";
import { validateConcurrency } from "../utils/concurrency.mts";
import { getPages } from "../utils/connect.mts";
import { Pool } from "../utils/pool.mts";
import { Progress } from "../utils/progress.mts";

/**
Create thumbnail sheets for a Liqvid video.
*/
export function thumbs({
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
  width,
}: {
  browserExecutable: string;
  browserHeight: number;
  browserWidth: number;
  colorScheme: "light" | "dark";
  cols: number;
  concurrency: number;

  /** seconds between thumbnails */
  frequency: number;
  height: number;
  imageFormat: ImageFormat;
  output: string;
  quality: number;
  rows: number;
  url: string;
  width: number;
}) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    let step = 1;
    const total = 3;

    // validation
    const executablePath = yield* Effect.promise(() =>
      getEnsureChrome(browserExecutable),
    );

    if (path.extname(output) !== `.${imageFormat}`) {
      return yield* Effect.die(
        `File pattern '${output}' does not match format '${imageFormat}'.`,
      );
    }

    concurrency = validateConcurrency(concurrency);

    // browserHeight / browserWidth default to height/width
    browserHeight ??= height;
    browserWidth ??= width;

    // make directories
    const [tmpDir] = yield* Effect.all([
      fs.makeTempDirectory({ prefix: "liqvid.thumbs" }),
      fs.makeDirectory(path.dirname(output), { recursive: true }),
    ]);

    yield* Effect.log(
      `Connecting to ${url} with ${concurrency} browser instances...`,
    );

    // pool of puppeteer instances
    yield* Effect.logDebug("testing debug logging");
    yield* Effect.log(`(${step++}/${total}) Connecting to players...`);
    yield* Effect.logDebug("testing debug logging");

    const { numThumbs } = yield* Effect.gen(function* () {
      const pages = yield* getPages({
        colorScheme,
        concurrency,
        executablePath,
        height: browserHeight,
        renderMode: "thumbs",
        url,
        width: browserWidth,
      });

      const pool = new Pool(pages);
      for (const page of pages) {
        (page as any).client = yield* Effect.promise(() =>
          page.target().createCDPSession(),
        );
      }

      // calculate how many thumbs
      const durationSeconds = yield* Effect.promise(() =>
        pages[0]!.evaluate(() => {
          return player.playback.duration;
        }),
      );

      const numThumbs = Math.ceil(durationSeconds / frequency);

      // grab thumbs and assemble them
      yield* Effect.log(`(${step++}/${total}) Capturing thumbs...`);
      yield* captureRange({
        count: numThumbs,
        filename: (i) => path.join(tmpDir, `${i}.${imageFormat}`),
        imageFormat,
        pool,
        time: (i) => i * frequency,
      });

      return { numThumbs };
    }).pipe(Effect.scoped);

    yield* Effect.log(`(${step++}/${total}) Assembling sheets...`);
    yield* assembleSheets({
      cols,
      height,
      imageFormat,
      numThumbs,
      output,
      quality,
      rows,
      tmpDir,
      width,
    });

    // clean up tmp files
    yield* Effect.log("Cleaning up...");
    yield* fs.remove(tmpDir, { recursive: true });

    // done
    yield* Effect.log("Done!");
  });
}

/**
Assemble thumb screenshots into sheets.
*/
function assembleSheets({
  cols,
  height,
  imageFormat,
  numThumbs,
  output,
  quality,
  rows,
  tmpDir,
  width,
}: {
  cols: number;
  height: number;
  imageFormat: ImageFormat;
  numThumbs: number;
  output: string;
  quality: number;
  rows: number;
  tmpDir: string;
  width: number;
}) {
  return Effect.gen(function* () {
    const numSheets = Math.ceil(numThumbs / cols / rows);

    // progress bar
    const progress = yield* Progress;
    const sheetsBar = new progress.SingleBar();

    sheetsBar.start(numThumbs, 0);

    yield* Effect.promise(() =>
      Promise.all(
        new Array(numSheets).fill(null).map(async (_, sheetNum) => {
          const sheet = new jimp(cols * width, rows * height);

          // blit thumbs into here
          await Promise.all(
            new Array(cols * rows).fill(null).map(async (_, i) => {
              const index = sheetNum * cols * rows + i;
              if (index >= numThumbs) return;

              const thumb = await jimp.read(
                path.join(tmpDir, `${index}.${imageFormat}`),
              );
              if (imageFormat === "jpeg") {
                thumb.quality(quality);
              }
              thumb.resize(width, height);
              sheet.blit(
                thumb,
                (i % cols) * width,
                Math.floor(i / rows) * height,
              );
              sheetsBar.increment();
            }),
          );

          await sheet.writeAsync(output.replace("%s", sheetNum.toString()));
        }),
      ),
    );

    sheetsBar.stop();
  });
}
