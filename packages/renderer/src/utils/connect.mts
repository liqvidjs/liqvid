/** biome-ignore-all lint/suspicious/noExplicitAny: this is fine */
import cliProgress from "cli-progress";
import { Cause, Effect } from "effect";
import type * as Puppeteer from "puppeteer-core";

import type { ColorScheme, RenderMode } from "../types.mts";

import { acquireBrowser } from "./effect.mts";
import { Progress } from "./progress.mts";

/** Namespace for the Liqvid player iframe API */
export const PLAYER_API_NAMESPACE = "@liqvid/player";

/**
 * Connect to a page running Liqvid.
 */
export function connect({
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
  return Effect.gen(function* () {
    yield* Effect.logDebug("got new page");

    // init page
    const page = yield* Effect.acquireRelease(
      Effect.promise(() => browser.newPage()),
      (page) => Effect.promise(() => page.close()),
    ).pipe(
      Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
      Effect.orDie,
    );
    page.setViewport({ height, width });
    page.on("error", console.error);
    page.on("pageerror", console.error);

    yield* Effect.promise(() => page.goto(url, { timeout: 0 }));

    yield* Effect.logDebug(`connected to url`);

    // connect to player API
    yield* Effect.promise(() =>
      page.waitForFunction(
        () =>
          (window.player = (document.querySelector(".lv-player") as any)?.[
            Symbol.for("@liqvid/player/api")
          ]),
        {
          timeout: 30_000,
        },
      ),
    );

    yield* Effect.logDebug("found liqvid player api");

    // set various things
    yield* Effect.promise(() =>
      page.evaluate(
        async (colorScheme, renderMode) => {
          player.setColorScheme(colorScheme);
          player.setRenderMode(renderMode);
          player.toggleControls(false);

          document.body.style.background = "transparent";
        },
        colorScheme,
        renderMode,
      ),
    );

    yield* Effect.logDebug("called the player api for setup");

    // set color scheme for whole page also
    yield* Effect.promise(() =>
      page.emulateMediaFeatures([
        {
          name: "prefers-color-scheme",
          value: colorScheme,
        },
      ]),
    );

    yield* Effect.logDebug("set color scheme");

    yield* Effect.logDebug("page ready");

    return page;
    // biome-ignore assist/source/useSortedKeys: meaningful order (url is most important)
  }).pipe(Effect.annotateLogs({ url, colorScheme, height, width }));
}

/**
Connect to players.
*/
export function getPages({
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
  executablePath: string;
  height: number;
  renderMode: RenderMode;
  url: string;
  width: number;
}) {
  return Effect.gen(function* () {
    // progress bar
    const progress = yield* Progress;
    const playerBar = new progress.SingleBar({
      etaBuffer: 1,
    });
    playerBar.start(concurrency, 0);

    yield* Effect.logDebug("acquiring browser");

    // get local browser
    const browser = yield* acquireBrowser({
      acceptInsecureCerts: true,
      args: [process.platform === "linux" ? "--single-process" : null].filter(
        Boolean,
      ) as string[],
      browser: "chrome",
      executablePath,
      headless: process.env.HEADLESS !== "false",
      timeout: 0,
    });

    yield* Effect.logDebug("acquired browser");

    // array of Page objects
    const pages = yield* Effect.all(
      new Array(concurrency).fill(null).map((_, i) => {
        return Effect.gen(function* () {
          yield* Effect.logDebug(`effect number ${i}`);
          return yield* connect({
            browser,
            colorScheme,
            height,
            renderMode,
            url,
            width,
          }).pipe(
            Effect.tap(() =>
              Effect.sync(() => {
                playerBar.increment();
              }),
            ),
          );
        });
      }),
      { concurrency: "unbounded" },
    );

    playerBar.stop();

    yield* Effect.logDebug("connected to all pages");

    // TODO: legacy, may not be needed anymore
    yield* Effect.all(
      pages.map((page) =>
        Effect.promise(async () => {
          (page as any).client = await page.target().createCDPSession();
        }),
      ),
    );

    yield* Effect.logDebug("created CDP sessions");

    return pages;
  }).pipe(
    Effect.annotateLogs({
      concurrency,
      renderMode,
      url,
    }),
  );
}

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
