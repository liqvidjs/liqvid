import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ResizeFit, Transformer } from "@napi-rs/image";
import { Effect, FileSystem, PubSub } from "effect";
import type { AbsoluteFile } from "effect-paths";

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

Screenshot capture is the only step fanned out across those pages. Each color
scheme has its own progress bar (`light 2/168`). As each screenshot lands it
is published and blitted into its sheet, so assembly overlaps capture.
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
    const total = 2;

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
      progress: false,
      renderMode: "thumbs",
      url,
      width: browserWidth,
    });

    const pool = new Pool(pages);

    // calculate how many thumbs
    const durationSeconds = yield* Effect.promise(() =>
      pages[0]!.evaluate(() => player.playback.duration),
    );

    const numThumbs = Math.ceil(durationSeconds / frequency);

    yield* Effect.log(`(${step++}/${total}) Capturing thumbs...`);
    const { SingleBar } = yield* Progress;

    for (const [i, { colorScheme, output }] of passes.entries()) {
      // re-apply the scheme to every page before capturing this pass
      yield* Effect.all(
        pages.map((page) => setColorScheme(page, colorScheme)),
        { concurrency: "unbounded" },
      );

      const captureBar = new SingleBar({ format: { scheme: colorScheme } });
      captureBar.start(numThumbs, 0);

      // Subscribe before capture publishes, then blit each shot as it lands.
      // Bounded so a slow blit backpressures instead of dropping frames.
      yield* Effect.scoped(
        Effect.gen(function* () {
          const pubsub = yield* PubSub.bounded<CapturedThumb>(
            Math.max(1, concurrency),
          );
          const subscription = yield* PubSub.subscribe(pubsub);

          yield* Effect.all(
            [
              blitCaptured({
                cols,
                height,
                imageFormat,
                numThumbs,
                output,
                quality,
                rows,
                subscription,
                tmpDir: tmpDirs[i]!,
                width,
              }),
              captureRange({
                bar: captureBar,
                count: numThumbs,
                filename: (j) => path.join(tmpDirs[i]!, `${j}.${imageFormat}`),
                imageFormat,
                onCaptured: (index) =>
                  PubSub.publish(pubsub, { _tag: "thumb", index }).pipe(
                    Effect.flatMap((accepted) =>
                      accepted
                        ? Effect.void
                        : Effect.die(
                            "dropped a thumbnail before it was blitted",
                          ),
                    ),
                  ),
                pool,
                time: (j) => j * frequency,
              }).pipe(
                Effect.ensuring(
                  PubSub.end(pubsub, { _tag: "end" }).pipe(Effect.asVoid),
                ),
              ),
            ],
            { concurrency: "unbounded" },
          );
        }),
      ).pipe(
        Effect.annotateLogs({ colorScheme }),
        Effect.ensuring(Effect.sync(() => captureBar.stop())),
      );
    }

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

type CapturedThumb =
  | { readonly _tag: "end" }
  | { readonly _tag: "thumb"; readonly index: number };

/**
Blit each captured screenshot into its sheet as it arrives, and write a sheet
once every cell in it has landed.
*/
const blitCaptured = Effect.fnUntraced(
  function* ({
    cols,
    height,
    imageFormat,
    numThumbs,
    output,
    quality,
    rows,
    subscription,
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
    subscription: PubSub.Subscription<CapturedThumb>;
    tmpDir: string;
    width: number;
  }) {
    const perSheet = cols * rows;
    const sheetWidth = cols * width;
    const sheetHeight = rows * height;
    const sheets = new Map<
      number,
      {
        expected: number;
        filled: number;
        image: ReturnType<typeof Transformer.fromRgbaPixels>;
      }
    >();

    while (true) {
      const message = yield* PubSub.take(subscription);
      if (message._tag === "end") return;

      const { index } = message;
      const sheetNum = Math.floor(index / perSheet);
      const cell = index % perSheet;

      let sheet = sheets.get(sheetNum);
      if (!sheet) {
        sheet = {
          expected: Math.min(perSheet, numThumbs - sheetNum * perSheet),
          filled: 0,
          // Transparent canvas; JPEG encode flattens empty cells to black.
          image: Transformer.fromRgbaPixels(
            new Uint8Array(sheetWidth * sheetHeight * 4),
            sheetWidth,
            sheetHeight,
          ),
        };
        sheets.set(sheetNum, sheet);
      }
      const current = sheet;

      yield* Effect.promise(async () => {
        const bytes = await readFile(
          path.join(tmpDir, `${index}.${imageFormat}`),
        );
        // PNG intermediate so JPEG quality is applied once, on the sheet.
        const thumb = await new Transformer(bytes)
          .resize(width, height, null, ResizeFit.Fill)
          .png();
        current.image.overlay(
          thumb,
          (cell % cols) * width,
          Math.floor(cell / rows) * height,
        );
      });

      current.filled += 1;
      if (current.filled < current.expected) continue;

      sheets.delete(sheetNum);
      yield* Effect.promise(async () => {
        const encoded =
          imageFormat === "jpeg"
            ? await current.image.jpeg(quality)
            : await current.image.png();
        await writeFile(output.replace("%s", sheetNum.toString()), encoded);
      });
    }
  },
  (effect) => effect.pipe(Effect.withLogSpan("blitCaptured")),
);
