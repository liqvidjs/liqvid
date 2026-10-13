import { afterEach, describe, expect, test } from "@jest/globals";
import type { Page } from "puppeteer-core";

import {
  captureCanvas,
  GREENSCREEN,
  pixelAt,
  waitForStableCanvas,
} from "./harness/frames.ts";
import { type Harness, startHarness } from "./harness/harness.ts";

// tests/greenscreen is a #00FF00 background with a red 80x80 box at (120, 50).
const BACKGROUND = { x: 10, y: 10 };
const SUBJECT = { x: 160, y: 90 };

async function waitForKeyedFrame(page: Page): Promise<string> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const capture = await captureCanvas(page);
    const [, , , alpha] = await pixelAt(page, capture, SUBJECT.x, SUBJECT.y);
    if (alpha > 0) return waitForStableCanvas(page);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Greenscreen frame was never drawn");
}

function countMainThreadPixelReads() {
  const counts = { getImageData: 0 };
  (window as unknown as { __counts: typeof counts }).__counts = counts;
  const original = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function (
    this: CanvasRenderingContext2D,
    ...args: Parameters<typeof original>
  ) {
    counts.getImageData += 1;
    return original.apply(this, args);
  } as typeof original;
}

describe("greenscreen", () => {
  let harness: Harness | null = null;

  afterEach(async () => {
    await harness?.page.evaluate(() => window.__fixture.unmount());
    await harness?.close();
    harness = null;
  });

  async function mount(
    greenscreen: true | { color: `#${string}` },
    browserArgs: string[] = [],
  ): Promise<string> {
    harness = await startHarness({
      browserArgs,
      init: [countMainThreadPixelReads],
    });
    await harness.page.evaluate(
      (hls, greenscreen) => {
        window.__fixture.playback.currentTime = 0.5;
        window.__fixture.mount({ greenscreen, hls });
      },
      GREENSCREEN,
      greenscreen,
    );
    return waitForKeyedFrame(harness.page);
  }

  test("keys out the green background and keeps the subject", async () => {
    const capture = await mount(true);
    const { page } = harness!;
    expect((await pixelAt(page, capture, BACKGROUND.x, BACKGROUND.y))[3]).toBe(
      0,
    );
    const [r, g, b, a] = await pixelAt(page, capture, SUBJECT.x, SUBJECT.y);
    expect(a).toBe(255);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(60);
    expect(b).toBeLessThan(60);
  });

  test("keys out a custom color", async () => {
    const page = await (async () => {
      harness = await startHarness();
      await harness.page.evaluate((hls) => {
        window.__fixture.playback.currentTime = 0.5;
        window.__fixture.mount({ greenscreen: { color: "#FF0000" }, hls });
      }, GREENSCREEN);
      return harness.page;
    })();
    // The subject is keyed out, so wait for the background instead.
    const deadline = Date.now() + 10_000;
    let capture = await captureCanvas(page);
    while (
      (await pixelAt(page, capture, BACKGROUND.x, BACKGROUND.y))[3] === 0 &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      capture = await captureCanvas(page);
    }
    capture = await waitForStableCanvas(page);

    const [r, g, , a] = await pixelAt(
      page,
      capture,
      BACKGROUND.x,
      BACKGROUND.y,
    );
    expect(a).toBe(255);
    expect(g).toBeGreaterThan(200);
    expect(r).toBeLessThan(60);
    expect((await pixelAt(page, capture, SUBJECT.x, SUBJECT.y))[3]).toBe(0);
  });

  describe("without WebGL", () => {
    const NO_WEBGL = ["--disable-webgl", "--disable-3d-apis"];

    test("keys out the green background and keeps the subject", async () => {
      const capture = await mount(true, NO_WEBGL);
      const { page } = harness!;
      expect(
        (await pixelAt(page, capture, BACKGROUND.x, BACKGROUND.y))[3],
      ).toBe(0);
      const [r, g, , a] = await pixelAt(page, capture, SUBJECT.x, SUBJECT.y);
      expect(a).toBe(255);
      expect(r).toBeGreaterThan(200);
      expect(g).toBeLessThan(60);
    });

    test("does not process pixels on the main thread", async () => {
      await mount(true, NO_WEBGL);
      const reads = await harness!.page.evaluate(
        () =>
          (window as unknown as { __counts: { getImageData: number } }).__counts
            .getImageData,
      );
      expect(reads).toBe(0);
    });
  });
});
