import { test, expect } from "./conftest";

let playback: any;
let script: any;

let { sleep, fuzzTime } = require("./test-apps/utils");

test("basic", async ({ page, port }) => {
  await page.goto(`http://localhost:${port}/basic.html`);
  let info = await page.evaluate(() => {
    let { currentTime, paused } = playback;
    return { currentTime, paused };
  });
  expect(info.currentTime).toBe(0);
  expect(info.paused).toBe(true);

  const sel1 = "[data-during='one']";
  const sel2 = "[data-during='two']";
  const hiddenStyle = "opacity: 0; pointer-events: none;";

  expect(await page.getAttribute(sel1, "style")).toBe("");
  expect(await page.getAttribute(sel2, "style")).toBe(hiddenStyle);

  await page.evaluate(() => {
    playback.seek(script.parseStart("two"));
  });
  expect(await page.getAttribute(sel1, "style")).toBe(hiddenStyle);
  expect(await page.getAttribute(sel2, "style")).toBe("");
  await page.evaluate(() => {
    playback.seek(script.parseStart("two"));
  });

  let curTime = await page.evaluate(async () => {
    playback.seek(0);
    playback.play();
    await sleep(1000 + fuzzTime);
    playback.pause();
    return playback.currentTime;
  });
  expect(Math.abs(curTime - 1000 - fuzzTime)).toBeLessThan(2 * fuzzTime);
  expect(
    (await page.getAttribute(sel1, "style")).slice(0, hiddenStyle.length)
  ).toBe(hiddenStyle);
  expect(await page.getAttribute(sel2, "style")).toBe("");
});

test("logs are fun", async ({ page, port }) => {
  await page.goto(`http://localhost:${port}/logs_are_fun.html`);
  const text = await page.innerText(".rp-canvas");
  expect(text.slice(0, "Logarithms".length)).toBe("Logarithms");
});
