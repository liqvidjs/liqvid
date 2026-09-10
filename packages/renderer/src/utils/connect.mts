/** biome-ignore-all lint/suspicious/noExplicitAny: this is fine */

import { range } from "@liqvid/utils";
import { Cause, Effect } from "effect";
import type { AbsoluteFile } from "effect-paths";
import type * as Puppeteer from "puppeteer-core";

import type { ColorScheme, RenderMode } from "../types.mts";

import { acquireBrowser } from "./effect.mts";
import { Progress } from "./progress.mts";

/** Namespace for the Liqvid player iframe API */
export const PLAYER_API_NAMESPACE = "@liqvid/player";

/**
 * (Re)apply a color scheme to an already-connected page. Sets both the player's
 * color scheme and the page-level `prefers-color-scheme` media feature. Safe to
 * call multiple times, which lets a single page be reused to capture multiple
 * schemes without reloading the URL.
 */
export const setColorScheme = Effect.fnUntraced(function* (
  page: Puppeteer.Page,
  colorScheme: ColorScheme,
) {
  yield* Effect.tryPromise(() =>
    page.evaluate((colorScheme) => {
      player.setColorScheme(colorScheme);
    }, colorScheme),
  );

  yield* Effect.tryPromise(() =>
    page.emulateMediaFeatures([
      {
        name: "prefers-color-scheme",
        value: colorScheme,
      },
    ]),
  );

  yield* Effect.logDebug("set color scheme").pipe(
    Effect.annotateLogs({ colorScheme }),
  );
});

/**
 * Connect to a page running Liqvid.
 * Returns the page after setup. Caller is responsible for page cleanup.
 */
export const connect = Effect.fnUntraced(
  function* ({
    browser,
    colorScheme = "light",
    height,
    url,
    renderMode,
    width,
  }: {
    browser: Puppeteer.Browser;
    colorScheme?: ColorScheme;
    height: number;
    url: string;
    width: number;
    renderMode: RenderMode;
  }) {
    const timeout = 5_000;

    // Create page - caller manages lifecycle via getPages' finalizer
    const page = yield* Effect.tryPromise(() => browser.newPage()).pipe(
      Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
      Effect.orDie,
    );

    page.on("error", console.error);
    page.on("pageerror", console.error);

    yield* Effect.logDebug("got new page");

    yield* Effect.tryPromise(() => page.setViewport({ height, width })).pipe(
      Effect.tapError((e) =>
        Effect.logError("failed to set page viewport", { error: e }),
      ),
    );

    yield* Effect.logDebug("set page viewport");

    // Only wait for the DOM to be ready, not the full `load` event. Preview
    // pages stream HLS video and pull assets from external CDNs, so `load` can
    // take a long time (or effectively never settle). We wait for the player
    // API separately below, which is the signal we actually care about.
    yield* Effect.tryPromise((signal) =>
      page.goto(url, { signal, timeout, waitUntil: "domcontentloaded" }),
    ).pipe(
      Effect.tapError((e) =>
        Effect.logError("timed out navigating to page", {
          error: e,
        }).pipe(Effect.annotateLogs({ timeout })),
      ),
    );

    yield* Effect.logDebug("connected to url, waiting for player api");

    // connect to player API.
    // Poll on an interval rather than the default requestAnimationFrame: rAF is
    // throttled/paused in headless or backgrounded pages, which can make the
    // wait time out even though the player API attaches almost immediately.
    yield* Effect.tryPromise((signal) =>
      page.waitForFunction(
        () =>
          (window.player = (document.querySelector(".lv-player") as any)?.[
            Symbol.for("@liqvid/player/api")
          ]),
        {
          polling: 100,
          signal,
          timeout,
        },
      ),
    ).pipe(
      Effect.tapError((e) =>
        Effect.logError("timed out waiting for player api", {
          error: e,
        }).pipe(Effect.annotateLogs({ timeout })),
      ),
    );

    yield* Effect.logDebug("found liqvid player api");

    // one-time page setup (independent of color scheme)
    yield* Effect.tryPromise(() =>
      page.evaluate((renderMode) => {
        player.setRenderMode(renderMode);
        player.toggleControls(false);

        document.body.style.background = "transparent";
      }, renderMode),
    );

    yield* Effect.logDebug("called the player api for setup");

    // apply the initial color scheme (can be re-applied later for reuse)
    yield* setColorScheme(page, colorScheme);

    yield* Effect.logDebug("page ready");

    return page;
  },
  (effect, { url, colorScheme, height, width }) =>
    effect.pipe(
      Effect.withLogSpan("player-api"),
      // biome-ignore assist/source/useSortedKeys: meaningful order (url is most important)
      Effect.annotateLogs({ url, colorScheme, height, width }),
    ),
);

/**
Connect to players.
*/
export const getPages = Effect.fnUntraced(
  function* ({
    colorScheme = "light",
    concurrency,
    executablePath,
    height,
    renderMode,
    url,
    width,
  }: {
    colorScheme: "light" | "dark";
    concurrency: number;
    executablePath: AbsoluteFile;
    height: number;
    renderMode: RenderMode;
    url: string;
    width: number;
  }) {
    // progress bar
    const progress = yield* Progress;
    const playerBar = new progress.SingleBar({
      etaBuffer: 1,
    });
    playerBar.start(concurrency, 0);

    // get local browser - acquireRelease handles cleanup when scope closes
    const browser = yield* acquireBrowser({
      acceptInsecureCerts: true,
      args: [process.platform === "linux" ? "--single-process" : null].filter(
        Boolean,
      ) as string[],
      browser: "chrome",
      executablePath,
      headless: process.env.HEADLESS !== "false",
      timeout: 0,
    } satisfies Puppeteer.LaunchOptions);

    // Track pages as they're created for interruption cleanup
    const createdPages: Puppeteer.Page[] = [];

    // array of Page objects
    const pages = yield* Effect.all(
      range(concurrency).map(() =>
        connect({
          browser,
          colorScheme,
          height,
          renderMode,
          url,
          width,
        }).pipe(
          Effect.tap((page) =>
            Effect.sync(() => {
              createdPages.push(page);
              playerBar.increment();
            }),
          ),
        ),
      ),
      { concurrency: "unbounded" },
    ).pipe(
      // If interrupted during connection, clean up any pages that were created
      Effect.onInterrupt(() =>
        Effect.all(
          createdPages.map((page) => Effect.promise(() => page.close())),
          { concurrency: "unbounded" },
        ).pipe(Effect.ignore),
      ),
    );

    // Register cleanup for pages when scope closes normally
    // Note: browser.close() also closes all pages, but explicit cleanup is cleaner
    yield* Effect.addFinalizer(() =>
      Effect.all(
        pages.map((page) => Effect.promise(() => page.close())),
        { concurrency: "unbounded" },
      ).pipe(Effect.ignore),
    );

    playerBar.stop();

    yield* Effect.logDebug("connected to all pages");

    return pages;
  },
  (effect, { concurrency, renderMode, url }) =>
    effect.pipe(
      Effect.annotateLogs({
        concurrency,
        renderMode,
        url,
      }),
    ),
);

/**
 * Call a method on the Liqvid player via postMessage API.
 * This sends a message to the page and waits for the response.
 */
export async function callPlayerApi(
  page: Puppeteer.Page,
  method: string,
  args: unknown[],
): Promise<unknown> {
  return page.evaluate(
    ({ args, method, namespace }) => {
      return new Promise((resolve, reject) => {
        const requestId = Math.random();

        const handleMessage = (event: MessageEvent) => {
          const data = event.data;
          if (
            !data ||
            typeof data !== "object" ||
            data.namespace !== namespace ||
            data.requestId !== requestId
          ) {
            return;
          }

          if (data.type === "return") {
            window.removeEventListener("message", handleMessage);
            resolve(data.value);
          } else if (data.type === "error") {
            window.removeEventListener("message", handleMessage);
            reject(new Error(data.error));
          }
        };

        window.addEventListener("message", handleMessage);

        window.postMessage(
          {
            arguments: args,
            method,
            namespace,
            requestId,
            type: "call",
          },
          "*",
        );
      });
    },
    { args, method, namespace: PLAYER_API_NAMESPACE },
  );
}
