import { Effect } from "effect";
import puppeteer from "puppeteer-core";

/**
 * Effectfully acquire a Puppeteer instance.
 */
export function acquireBrowser(
  options: Parameters<typeof puppeteer.launch>[0],
) {
  return Effect.acquireRelease(
    Effect.promise(() => puppeteer.launch(options)),
    (browser) => Effect.promise(() => browser.close()).pipe(Effect.orDie),
  );
}
