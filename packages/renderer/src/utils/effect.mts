import { Effect } from "effect";
import type * as Puppeteer from "puppeteer-core";
import puppeteer from "puppeteer-core";

/**
 * Effectfully acquire a Puppeteer instance.
 */
export function acquireBrowser(options?: Puppeteer.LaunchOptions) {
  return Effect.gen(function* () {
    const signal = yield* Effect.abortSignal;

    yield* Effect.logDebug("acquiring browser");

    const browser = yield* Effect.acquireRelease(
      Effect.promise(() => puppeteer.launch({ ...options, signal })),
      (browser) => Effect.promise(() => browser.close()).pipe(Effect.orDie),
    );

    yield* Effect.logDebug("acquired browser");

    return browser;
  }).pipe(Effect.annotateLogs({ options }));
}
