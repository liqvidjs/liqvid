import { Cause, Effect } from "effect";
import type * as Puppeteer from "puppeteer-core";
import puppeteer from "puppeteer-core";

/**
 * Effectfully acquire a Puppeteer instance.
 */
export function acquireBrowser(options?: Puppeteer.LaunchOptions) {
  return Effect.gen(function* () {
    yield* Effect.logDebug("acquiring browser");

    const browser = yield* Effect.acquireRelease(
      Effect.tryPromise(() => puppeteer.launch({ ...options })).pipe(
        Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
      ),
      (browser) => Effect.tryPromise(() => browser.close()).pipe(Effect.orDie),
    );

    yield* Effect.logDebug("acquired browser");

    return browser;
  }).pipe(Effect.annotateLogs({ options }));
}
