import cliProgress from "cli-progress";
import puppeteer from "puppeteer-core";

/**
  Connect to a page running Liqvid.
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
  page.setViewport({height, width});
  page.on("error", console.error);
  page.on("pageerror", console.error);

  await page.goto(url, {timeout: 0});

  await page.waitForSelector(".rp-controls, .lv-controls");

  // hide controls
  await page.evaluate(() => {
    (document.querySelector(".rp-controls") as HTMLDivElement).style.display =
      "none";
    document.body.style.background = "transparent";
  });

  // set color scheme
  await page.emulateMediaFeatures([
    {
      name: "prefers-color-scheme",
      value: colorScheme,
    },
  ]);

  // set player as global variable
  // HA HA HA THIS IS HORRIBLE
  await page.evaluate(async () => {
    const playerElement = document.querySelector(".lv-player");
    const symbol = Symbol.for("@liqvid/player/element");
    window.player = playerElement[symbol];
  });

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
        width,
        url,
      });

      playerBar.increment();

      return page;
    }),
  );
  playerBar.stop();

  return pages;
}
