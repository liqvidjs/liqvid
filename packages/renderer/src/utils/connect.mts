import cliProgress from "cli-progress";
import puppeteer from "puppeteer-core";

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
  width,
}: {
  browser: puppeteer.Browser;
  colorScheme?: "light" | "dark";
  height: number;
  url: string;
  width: number;
}) {
  // init page
  const page = await browser.newPage();
  page.setViewport({ height, width });
  page.on("error", console.error);
  page.on("pageerror", console.error);

  await page.goto(url, { timeout: 0 });

  await page.waitForSelector(".lv-controls");

  await renderingApi.toggleControls(page, false);

  page.evaluate(() => {
    document.body.style.background = "transparent";
  });

  // set color scheme
  await page.emulateMediaFeatures([
    {
      name: "prefers-color-scheme",
      value: colorScheme,
    },
  ]);

  return page;
}

export const renderingApi = {
  setColorScheme(page: puppeteer.Page, colorScheme: "light" | "dark") {
    return callPlayerApi(page, "setColorScheme", [colorScheme]);
  },
  toggleControls(page: puppeteer.Page, visible?: boolean) {
    return callPlayerApi(page, "toggleControls", [visible]);
  },
};

/**
Connect to players.
*/
export async function getPages({
  colorScheme = "light",
  concurrency,
  executablePath,
  height,
  url,
  width,
}: {
  colorScheme: "light" | "dark";
  concurrency: number;
  executablePath: string;
  height: number;
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
    args: [process.platform === "linux" ? "--single-process" : null].filter(
      Boolean,
    ),
    executablePath,
    ignoreHTTPSErrors: true,
    product: "chrome",
    timeout: 0,
  });

  // array of Page objects
  const pages = await Promise.all(
    new Array(concurrency).fill(null).map(async () => {
      const page = await connect({
        browser,
        colorScheme,
        height,
        url,
        width,
      });

      playerBar.increment();

      return page;
    }),
  );
  playerBar.stop();

  return pages;
} /**
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
