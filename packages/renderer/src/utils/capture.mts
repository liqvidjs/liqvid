import { Effect } from "effect";
import type * as puppeteer from "puppeteer-core";

import type { ImageFormat } from "../types.mts";

import type { Pool } from "./pool.mts";
import { Progress } from "./progress.mts";

export async function capture({
  page,
  time,
  ...options
}: {
  page: puppeteer.Page;

  /** Time to capture in seconds */
  time: number;
} & puppeteer.ScreenshotOptions) {
  await page.evaluate((time) => {
    const { playback } = player;
    playback.currentTime = time;

    // wait for video seeking etc to settle

    // return new Promise<void>((resolve) => {
    //   setTimeout(() => {
    //     resolve();
    //   }, 2000);
    // });

    if (playback.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;

    return new Promise<void>((resolve) => {
      const listener = () => {
        if (playback.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        playback.removeEventListener("readystatechange", listener);
        resolve();
      };

      playback.addEventListener("readystatechange", listener);
    });
  }, time);

  await page.screenshot(options);
}

/**
Capture a range of frames.
*/
export const captureRange = Effect.fnUntraced(function* ({
  bar,
  count,
  filename,
  imageFormat,
  onCaptured,
  pool,
  quality,
  time,
}: {
  /**
   * Bar to advance as frames are captured. When omitted, this range creates
   * and owns a bar.
   */
  bar?: { increment(step?: number): void };
  count: number;
  filename: (i: number) => string;
  imageFormat: ImageFormat;
  /**
   * Called after the screenshot file is written and the page is released, so
   * a subscriber can blit the frame without holding a browser.
   */
  onCaptured?: (index: number) => Effect.Effect<void>;
  pool: Pool<puppeteer.Page>;
  quality?: number | undefined;
  time: (i: number) => number;
}) {
  // One bar for this range, unless the caller is already showing the only bar.
  let owned: { stop(): void } | undefined;
  let captureBar: { increment(step?: number): void };
  if (bar) {
    captureBar = bar;
  } else {
    const { SingleBar } = yield* Progress;
    const created = new SingleBar();
    created.start(count, 0);
    owned = created;
    captureBar = created;
  }

  // Frames are pulled from the page pool, so every browser shares one queue.
  yield* Effect.all(
    new Array(count).fill(null).map((_, i) =>
      Effect.gen(function* () {
        yield* Effect.gen(function* () {
          // get available puppeteer instance
          const page = yield* Effect.acquireRelease(
            Effect.promise(() => pool.acquire()),
            (page) => Effect.sync(() => pool.release(page)),
          );

          // capture frame
          yield* Effect.promise(() =>
            capture({
              page,
              path: filename(i),
              quality,
              time: time(i),
              type: imageFormat,
            }),
          );

          // for debugging
          if (
            yield* Effect.promise(() =>
              page.evaluate(() => window.__pause === true),
            )
          ) {
            yield* Effect.sleep("1 minutes");
          }
        }).pipe(Effect.scoped);

        // Page is released; the file is ready to blit.
        if (onCaptured) {
          yield* onCaptured(i);
        }

        captureBar.increment();
      }).pipe(Effect.annotateLogs({ i, time: time(i) })),
    ),
    { concurrency: "unbounded" },
  ).pipe(Effect.ensuring(Effect.sync(() => owned?.stop())));
});
