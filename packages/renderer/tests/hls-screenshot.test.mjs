import { afterAll, beforeAll, expect, test } from "@jest/globals";

import { FRAME_SIZE, startHarness, VIEWPORT } from "./harness.mjs";

// Same mean per-channel RGB tolerance used by the media HLS integration tests.
const MATCH_THRESHOLD = 6;
const FRAMES = [
  { reference: "frame_0s.png", seconds: 0 },
  { reference: "frame_1s.png", seconds: 1 },
  { reference: "frame_5s.png", seconds: 5 },
  { reference: "frame_7s_500ms.png", seconds: 7.5 },
];
const VIDEO_X = VIEWPORT.width - FRAME_SIZE.width;
const VIDEO_Y = VIEWPORT.height - FRAME_SIZE.height;

let harness;

beforeAll(async () => {
  harness = await startHarness();
  await harness.page.evaluate(
    (hls) => window.__fixture.mount(hls),
    "/tests/big-buck-bunny/stream.m3u8",
  );
}, 60_000);

afterAll(async () => {
  await harness?.close();
});

test.each(FRAMES)(
  "the clipped HLS screenshot at $seconds seconds matches $reference",
  async ({ reference, seconds }) => {
    const { page, origin } = harness;
    await page.evaluate((time) => window.__fixture.seek(time), seconds);
    const difference = await waitForScreenshotMatch(
      page,
      `${origin}/tests/big-buck-bunny/${reference}`,
    );
    expect(difference).toBeLessThanOrEqual(MATCH_THRESHOLD);
  },
);

async function waitForScreenshotMatch(page, reference) {
  const deadline = Date.now() + 15_000;
  let difference = Number.POSITIVE_INFINITY;
  while (Date.now() < deadline) {
    const screenshot = await page.screenshot({
      clip: {
        height: FRAME_SIZE.height,
        width: FRAME_SIZE.width,
        x: VIDEO_X,
        y: VIDEO_Y,
      },
      type: "png",
    });
    difference = await page.evaluate(
      async ({ image, reference }) => {
        const load = async (source) =>
          createImageBitmap(await (await fetch(source)).blob());
        const [actual, expected] = await Promise.all([
          load(`data:image/png;base64,${image}`),
          load(reference),
        ]);
        if (
          actual.width !== expected.width ||
          actual.height !== expected.height
        ) {
          return Number.POSITIVE_INFINITY;
        }
        const pixels = (bitmap) => {
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          const context = canvas.getContext("2d");
          context.drawImage(bitmap, 0, 0);
          return context.getImageData(0, 0, bitmap.width, bitmap.height).data;
        };
        const actualPixels = pixels(actual);
        const expectedPixels = pixels(expected);
        let total = 0;
        for (let index = 0; index < actualPixels.length; index += 4) {
          total +=
            Math.abs(actualPixels[index] - expectedPixels[index]) +
            Math.abs(actualPixels[index + 1] - expectedPixels[index + 1]) +
            Math.abs(actualPixels[index + 2] - expectedPixels[index + 2]);
        }
        return total / ((actualPixels.length / 4) * 3);
      },
      { image: screenshot.toString("base64"), reference },
    );
    if (difference <= MATCH_THRESHOLD) return difference;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return difference;
}
