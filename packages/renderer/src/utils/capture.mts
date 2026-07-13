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
    console.log({ readyState: playback.readyState });

    // return new Promise<void>((resolve) => {
    //   setTimeout(() => {
    //     resolve();
    //   }, 2000);
    // });

    if (playback.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) return;

    return new Promise<void>((resolve) => {
      const listener = () => {
        console.log({ readyState: playback.readyState });
        if (playback.readyState !== 4) return;
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
export function captureRange({
  count,
  filename,
  imageFormat,
  pool,
  quality,
  time,
}: {
  count: number;
  filename: (i: number) => string;
  imageFormat: ImageFormat;
  pool: Pool<puppeteer.Page>;
  quality?: number | undefined;
  time: (i: number) => number;
}) {
  return Effect.gen(function* () {
    // progress bar
    const progress = yield* Progress;
    const captureBar = new progress.SingleBar();
    captureBar.start(count, 0);

    // grab the thumbs
    yield* Effect.all(
      new Array(count).fill(null).map((_, i) =>
        Effect.gen(function* () {
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

          captureBar.increment();

          // for debugging
          if (
            yield* Effect.promise(() =>
              page.evaluate(() => window.__pause === true),
            )
          ) {
            yield* Effect.sleep("1 minutes");
          }
        }).pipe(Effect.annotateLogs({ i, time: time(i) }), Effect.scoped),
      ),
      { concurrency: "unbounded" },
    );

    captureBar.stop();
  });
}
