import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";

import {
  BBB,
  MATCH_THRESHOLD,
  REFERENCE_FRAMES,
  seek,
  waitForFrame,
} from "./harness/frames.ts";
import { type Harness, startHarness } from "./harness/harness.ts";

const HAVE_NOTHING = 0;
const HAVE_METADATA = 1;
const HAVE_CURRENT_DATA = 2;
const HAVE_ENOUGH_DATA = 4;

describe("ready state", () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startHarness();
  });

  afterAll(async () => {
    await harness.close();
  });

  test("reports loading until the first frame is shown", async () => {
    const { page } = harness;
    await page.evaluate((hls) => {
      window.__fixture.playback.currentTime = 1;
      window.__fixture.readyStates.length = 0;
      window.__fixture.mount({ frameAccurate: true, hls });
    }, BBB);
    expect(await waitForFrame(page, REFERENCE_FRAMES[1])).toBeLessThanOrEqual(
      MATCH_THRESHOLD,
    );
    await page.waitForFunction(
      (state) => window.__fixture.playback.readyState === state,
      {},
      HAVE_CURRENT_DATA,
    );
    const states = await page.evaluate(() => window.__fixture.readyStates);
    expect(states[0]).toBe(HAVE_NOTHING);
    expect(states.at(-1)).toBe(HAVE_CURRENT_DATA);
  });

  test("drops to HAVE_METADATA while seeking", async () => {
    const { page } = harness;
    await page.evaluate(() => {
      window.__fixture.readyStates.length = 0;
    });
    await seek(page, 5);
    expect(await waitForFrame(page, REFERENCE_FRAMES[5])).toBeLessThanOrEqual(
      MATCH_THRESHOLD,
    );
    await page.waitForFunction(
      (state) => window.__fixture.playback.readyState === state,
      {},
      HAVE_CURRENT_DATA,
    );
    const states = await page.evaluate(() => window.__fixture.readyStates);
    expect(states).toContain(HAVE_METADATA);
    expect(states.at(-1)).toBe(HAVE_CURRENT_DATA);
  });

  test("does not re-render while playing", async () => {
    const { page } = harness;
    const before = await page.evaluate(() => {
      window.__fixture.playback.play();
      return window.__fixture.commits;
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const after = await page.evaluate(() => {
      window.__fixture.playback.pause();
      return window.__fixture.commits;
    });
    expect(after - before).toBeLessThanOrEqual(1);
  });

  test("restores HAVE_ENOUGH_DATA on unmount", async () => {
    const { page } = harness;
    const state = await page.evaluate(() => {
      window.__fixture.unmount();
      return window.__fixture.playback.readyState;
    });
    expect(state).toBe(HAVE_ENOUGH_DATA);
  });
});

describe("with native HLS support", () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startHarness({ nativeHls: true });
    await harness.page.evaluate((hls) => {
      window.__fixture.playback.currentTime = 1;
      window.__fixture.mount({ frameAccurate: true, hls });
    }, BBB);
  });

  afterAll(async () => {
    await harness.page.evaluate(() => window.__fixture.unmount());
    await harness.close();
  });

  test("renders frames to the canvas", async () => {
    expect(
      await waitForFrame(harness.page, REFERENCE_FRAMES[1]),
    ).toBeLessThanOrEqual(MATCH_THRESHOLD);
  });

  test("uses an audio-only element for the native stream", async () => {
    const { origin, page } = harness;
    await page.waitForSelector("canvas");
    const elements = await page.evaluate(() =>
      [...document.querySelectorAll("audio, video")].map((element) => ({
        src: (element as HTMLMediaElement).src,
        tag: element.tagName.toLowerCase(),
      })),
    );
    expect(elements).toEqual([{ src: `${origin}${BBB}`, tag: "audio" }]);
  });
});
