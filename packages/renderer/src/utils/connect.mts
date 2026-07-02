import cliProgress from "cli-progress";
import puppeteer from "puppeteer-core";

import type { ColorScheme, RenderMode } from "../types.mts";

/** Namespace for the Liqvid player iframe API */
export const PLAYER_API_NAMESPACE = "@liqvid/player";

/**
 * Connect to a page running Liqvid.
 */
export async function connect({
  browser,
  colorScheme = "light",
  height,
  url,
  renderMode,
  width,
}: {
  browser: puppeteer.Browser;
  colorScheme?: ColorScheme;
  height: number;
  url: string;
  width: number;
  renderMode: RenderMode;
}) {
  // init page
  const page = await browser.newPage();
  page.setViewport({ height, width });
  page.on("error", console.error);
  page.on("pageerror", console.error);

  await page.goto(url, { timeout: 0 });

  await page.waitForSelector(".lv-controls");

  page.evaluate(
    (colorScheme, renderMode) => {
      const playerElt = document.querySelector(
        ".lv-player",
      ) as HTMLElement | null;

      if (!playerElt) {
        throw new Error("Player element not found");
      }

      playerElt.dataset.liqvidRenderMode = renderMode;

      // biome-ignore lint/suspicious/noExplicitAny: symbol
      window.player = (playerElt as any)[Symbol.for("@liqvid/player/api")];

      player.setColorScheme(colorScheme);
      player.toggleControls(false);

      document.body.style.background = "transparent";
    },
    colorScheme,
    renderMode,
  );

  // set color scheme for whole page also
  await page.emulateMediaFeatures([
    {
      name: "prefers-color-scheme",
      value: colorScheme,
    },
  ]);

  return page;
}

/**
Connect to players.
*/
export async function getPages({
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
  // progress bar
  const playerBar = new cliProgress.SingleBar(
    {
      autopadding: true,
      clearOnComplete: true,
      etaBuffer: 1,
      format: "{bar} {percentage}% | ETA: {eta_formatted} | {value}/{total}",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic,
  );
  playerBar.start(concurrency, 0);

  // get local browser
  const browser = await puppeteer.launch({
    acceptInsecureCerts: true,
    args: [process.platform === "linux" ? "--single-process" : null].filter(
      Boolean,
    ) as string[],
    browser: "chrome",
    executablePath,
    headless: process.env.HEADLESS !== "false",
    timeout: 0,
  });

  // array of Page objects
  const pages = await Promise.all(
    new Array(concurrency).fill(null).map(async () => {
      const page = await connect({
        browser,
        colorScheme,
        height,
        renderMode,
        url,
        width,
      });

      playerBar.increment();

      return page;
    }),
  );
  playerBar.stop();

  return pages;
}

/**
 * Call a method on the Liqvid player via postMessage API.
 * This sends a message to the page and waits for the response.
 */
export async function callPlayerApi(
  page: puppeteer.Page,
  method: string,
  args: unknown[],
): Promise<unknown> {
  return page.evaluate(
    ({ args, method, namespace }) => {
      return new Promise((resolve, reject) => {
        const requestId = Math.random();

        const handleMessage = (event: MessageEvent) => {
          console.log("got message", event.data);
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
