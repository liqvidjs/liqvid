import path from "node:path";

import { Effect, FileSystem } from "effect";
import type { AbsoluteFile } from "effect-paths";
import jimp from "jimp";

import type { ColorScheme, ImageFormat } from "../types.mts";
import { getEnsureChrome } from "../utils/binaries.mts";
import { captureRange } from "../utils/capture.mts";
import { validateConcurrency } from "../utils/concurrency.mts";
import { getPages, setColorScheme } from "../utils/connect.mts";
import { Pool } from "../utils/pool.mts";
import { Progress } from "../utils/progress.mts";

/** A single color scheme to capture and where to write its sheets. */
type SchemePass = {
  colorScheme: ColorScheme;

  /**
   * Pattern for output filenames. Interpolation patterns:
   * - `%s` sheet number (required)
   */
  output: string;
};

/**
Create thumbnail sheets for a Liqvid video.

Accepts either a single `{ colorScheme, output }` pass or an array of `schemes`.
When multiple schemes are given they share a single browser and set of loaded
pages: the URL is loaded once and each scheme is captured by re-applying the
color scheme to the existing pages, avoiding a second (contention-inducing)
page load.
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
  schemes,
  url,
  width,
}: {
  browserExecutable?: AbsoluteFile;
  browserHeight: number;
  browserWidth: number;
  /** Single-scheme color scheme (ignored when `schemes` is provided). */
  colorScheme?: ColorScheme;
  cols: number;
  concurrency: number;

  /** seconds between thumbnails */
  frequency: number;
  height: number;
  imageFormat: ImageFormat;
  /** Single-scheme output pattern (ignored when `schemes` is provided). */
  output?: string;
  quality: number;
  rows: number;
  /** Multiple color schemes to capture, sharing one browser. */
  schemes?: readonly SchemePass[];
  url: string;
  width: number;
}) {
  // Normalize to a list of scheme passes. Falls back to the single-scheme
  // (colorScheme + output) form for backwards compatibility (e.g. the CLI).
  const passes: readonly SchemePass[] =
    schemes && schemes.length > 0
      ? schemes
      : [{ colorScheme, output: output! }];

  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    let step = 1;
    const total = 3;

    // validation
    const executablePath = yield* Effect.promise(() =>
      getEnsureChrome(browserExecutable),
    );

    for (const { output } of passes) {
      if (path.extname(output) !== `.${imageFormat}`) {
        return yield* Effect.die(
          `File pattern '${output}' does not match format '${imageFormat}'.`,
        );
      }
    }

    concurrency = validateConcurrency(concurrency);

    // browserHeight / browserWidth default to height/width
    browserHeight ??= height;
    browserWidth ??= width;

    // make a temp dir per scheme + ensure each output directory exists
    const tmpDirs = yield* Effect.all(
      passes.map(() => fs.makeTempDirectory({ prefix: "liqvid.thumbs" })),
    );
    yield* Effect.all(
      passes.map(({ output }) =>
        fs.makeDirectory(path.dirname(output), { recursive: true }),
      ),
      { concurrency: "unbounded" },
    );

    yield* Effect.log(
      `Connecting to ${url} with ${concurrency} browser instances...`,
    );

    // pool of puppeteer instances
    yield* Effect.log(`(${step++}/${total}) Connecting to players...`);

    // Note: getPages uses acquireRelease for browser, so it needs to stay in the
    // outer scope (managed by Effect.scoped at the end of thumbs()). Do NOT wrap
    // this in an inner Effect.scoped or the browser will close prematurely.
    // Pages are loaded once with the first scheme; subsequent schemes reuse them.
    const pages = yield* getPages({
      colorScheme: passes[0]!.colorScheme,
      concurrency,
      executablePath,
      height: browserHeight,
      renderMode: "thumbs",
      url,
      width: browserWidth,
    });

    const pool = new Pool(pages);

    // calculate how many thumbs
    const durationSeconds = yield* Effect.promise(() =>
      pages[0]!.evaluate(() => {
        return player.playback.duration;
      }),
    );

    const numThumbs = Math.ceil(durationSeconds / frequency);

    // grab thumbs for each scheme, reusing the same pages
    yield* Effect.log(`(${step++}/${total}) Capturing thumbs...`);
    for (const [i, { colorScheme }] of passes.entries()) {
      // re-apply the scheme to every page before capturing this pass
      yield* Effect.all(
        pages.map((page) => setColorScheme(page, colorScheme)),
        { concurrency: "unbounded" },
      );

      yield* captureRange({
        count: numThumbs,
        filename: (j) => path.join(tmpDirs[i]!, `${j}.${imageFormat}`),
        imageFormat,
        pool,
        time: (j) => j * frequency,
      }).pipe(Effect.annotateLogs({ colorScheme }));
    }

    // assemble + clean up each scheme's sheets
    yield* Effect.log(`(${step++}/${total}) Assembling sheets...`);
    yield* Effect.all(
      passes.map(({ output }, i) =>
        assembleSheets({
          cols,
          height,
          imageFormat,
          numThumbs,
          output,
          quality,
          rows,
          tmpDir: tmpDirs[i]!,
          width,
        }),
      ),
      { concurrency: "unbounded" },
    );

    // clean up tmp files
    yield* Effect.log("Cleaning up...");
    yield* Effect.all(
      tmpDirs.map((tmpDir) => fs.remove(tmpDir, { recursive: true })),
      { concurrency: "unbounded" },
    );

    // done
    yield* Effect.log("Done!");
  }).pipe(
    Effect.withLogSpan("thumbs"),
    Effect.annotateLogs({
      browserExecutable,
      browserHeight,
      browserWidth,
      cols,
      concurrency,
      frequency,
      height,
      imageFormat,
      quality,
      rows,
      schemes: passes.map((p) => p.colorScheme),
      url,
      width,
    }),
    Effect.scoped,
  );
}

/**
Assemble thumb screenshots into sheets.
*/
const assembleSheets = Effect.fnUntraced(
  function* ({
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
  },
  (effect) => effect.pipe(Effect.withLogSpan("assembleSheets")),
);
