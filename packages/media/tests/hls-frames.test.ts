import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";

import {
  BBB,
  captureCanvas,
  imageDifference,
  MATCH_THRESHOLD,
  REFERENCE_FRAMES,
  type ReferenceTime,
  seek,
  waitForFrame,
  waitForStableCanvas,
} from "./harness/frames.ts";
import { type Harness, startHarness } from "./harness/harness.ts";

const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Segment URLs of the Big Buck Bunny playlist with their time ranges. */
function bbbSegments(): { end: number; path: string; start: number }[] {
  const lines = fs
    .readFileSync(path.join(TESTS_DIR, "big-buck-bunny/stream.m3u8"), "utf8")
    .split("\n");
  const segments: { end: number; path: string; start: number }[] = [];
  let time = 0;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]!.match(/^#EXTINF:([\d.]+)/);
    if (!match) continue;
    const duration = Number(match[1]);
    segments.push({
      end: time + duration,
      path: `/tests/big-buck-bunny/${lines[i + 1]!.trim()}`,
      start: time,
    });
    time += duration;
  }
  return segments;
}

function segmentAt(time: number): string {
  const segment = bbbSegments().find(
    ({ end, start }) => start <= time && time < end,
  );
  if (!segment) throw new Error(`No segment at ${time}`);
  return segment.path;
}

function countVideoDecoders() {
  const counts = { videoDecoders: 0 };
  (window as unknown as { __counts: typeof counts }).__counts = counts;
  const Original = window.VideoDecoder;
  if (Original) {
    window.VideoDecoder = class extends Original {
      constructor(init: VideoDecoderInit) {
        super(init);
        counts.videoDecoders += 1;
      }
    };
  }
}

describe("frame-accurate HLS rendering", () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startHarness({
      init: [countVideoDecoders],
    });
    await harness.page.evaluate((hls) => {
      window.__fixture.playback.currentTime = 0;
      window.__fixture.mount({ frameAccurate: true, hls });
    }, BBB);
  });

  afterAll(async () => {
    await harness.page.evaluate(() => window.__fixture.unmount());
    await harness.close();
  });

  test("renders the initial frame on mount", async () => {
    expect(
      await waitForFrame(harness.page, REFERENCE_FRAMES[0]),
    ).toBeLessThanOrEqual(MATCH_THRESHOLD);
  });

  test("reports buffered segments and preloads only the next segment", async () => {
    const { page, requests } = harness;
    await page.waitForFunction(
      () => window.__fixture.playback.buffered.length > 0,
    );
    const ranges = await page.evaluate(() => {
      const { buffered } = window.__fixture.playback;
      return Array.from({ length: buffered.length }, (_, index) => [
        buffered.start(index),
        buffered.end(index),
      ]);
    });
    expect(ranges[0]?.[0]).toBe(0);
    expect(ranges[0]?.[1]).toBeGreaterThan(10);

    const requestedSegments = requests.filter((request) =>
      /stream\d+\.ts$/.test(request),
    );
    expect(requestedSegments).toContain("/tests/big-buck-bunny/hls/stream1.ts");
    expect(requestedSegments).not.toContain(
      "/tests/big-buck-bunny/hls/stream2.ts",
    );
  });

  test("renders the frame at the current time after seeking", async () => {
    const order: ReferenceTime[] = [5, 1, 7.5, 0, 5];
    for (const time of order) {
      await seek(harness.page, time);
      const difference = await waitForFrame(
        harness.page,
        REFERENCE_FRAMES[time],
      );
      // Include the time so failures say which frame was wrong.
      expect({ match: difference <= MATCH_THRESHOLD, time }).toEqual({
        match: true,
        time,
      });

      // Guard against a trivially-passing comparison.
      const capture = await captureCanvas(harness.page);
      for (const other of Object.keys(REFERENCE_FRAMES)) {
        if (Number(other) === time) continue;
        expect(
          await imageDifference(
            harness.page,
            capture,
            REFERENCE_FRAMES[Number(other) as ReferenceTime],
          ),
        ).toBeGreaterThan(MATCH_THRESHOLD * 2);
      }
    }
  });

  test("decodes video off the main thread", async () => {
    await seek(harness.page, 1);
    await waitForFrame(harness.page, REFERENCE_FRAMES[1]);
    const decoders = await harness.page.evaluate(
      () =>
        (window as unknown as { __counts: { videoDecoders: number } }).__counts
          .videoDecoders,
    );
    expect(decoders).toBe(0);
  });

  test("playback ends on the same frame as seeking to that time", async () => {
    const { page } = harness;
    await seek(page, 5);
    await waitForFrame(page, REFERENCE_FRAMES[5]);

    await page.evaluate(() => window.__fixture.playback.play());
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const pausedAt = await page.evaluate(() => {
      window.__fixture.playback.pause();
      return window.__fixture.playback.currentTime;
    });
    expect(pausedAt).toBeGreaterThan(5.5);
    const played = await waitForStableCanvas(page);

    await seek(page, 0);
    await waitForFrame(page, REFERENCE_FRAMES[0]);
    await seek(page, pausedAt);
    const sought = await waitForStableCanvas(page);

    expect(await imageDifference(page, played, sought)).toBeLessThanOrEqual(
      MATCH_THRESHOLD,
    );
  });

  test("catches up after the main thread is blocked during playback", async () => {
    const { page } = harness;
    await seek(page, 1);
    await waitForFrame(page, REFERENCE_FRAMES[1]);

    await page.evaluate(() => window.__fixture.playback.play());
    await new Promise((resolve) => setTimeout(resolve, 300));
    const pausedAt = await page.evaluate(async () => {
      const blockUntil = performance.now() + 2000;
      while (performance.now() < blockUntil) {
        // Simulate a long main-thread task.
      }
      // Let the playback loop observe the jump in time, then pause.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      window.__fixture.playback.pause();
      return window.__fixture.playback.currentTime;
    });
    expect(pausedAt).toBeGreaterThan(3);
    const played = await waitForStableCanvas(page);

    await seek(page, 0);
    await waitForFrame(page, REFERENCE_FRAMES[0]);
    await seek(page, pausedAt);
    const sought = await waitForStableCanvas(page);

    expect(await imageDifference(page, played, sought)).toBeLessThanOrEqual(
      MATCH_THRESHOLD,
    );
  });

  test("a burst of seeks shows the final frame without loading skipped segments", async () => {
    const { page, requests } = harness;
    await seek(page, 0);
    await waitForFrame(page, REFERENCE_FRAMES[0]);

    const skipped = [100, 200, 300, 400].map(segmentAt);
    requests.length = 0;
    await page.evaluate(() => {
      for (const time of [100, 200, 300, 400, 7.5]) {
        window.__fixture.playback.currentTime = time;
      }
    });

    expect(await waitForFrame(page, REFERENCE_FRAMES[7.5])).toBeLessThanOrEqual(
      MATCH_THRESHOLD,
    );
    expect(requests.filter((request) => skipped.includes(request))).toEqual([]);
  });

  test("scrubbing lands on the released position", async () => {
    const { page } = harness;
    await seek(page, 0);
    await waitForFrame(page, REFERENCE_FRAMES[0]);

    await page.evaluate(async () => {
      const { playback } = window.__fixture;
      playback.seeking = true;
      for (const time of [20, 40, 60, 3, 6, 9, 5]) {
        playback.currentTime = time;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      playback.seeking = false;
    });

    expect(await waitForFrame(page, REFERENCE_FRAMES[5])).toBeLessThanOrEqual(
      MATCH_THRESHOLD,
    );
    // The frame stays put after release instead of walking forward.
    const settled = await waitForStableCanvas(page);
    expect(
      await imageDifference(page, settled, REFERENCE_FRAMES[5]),
    ).toBeLessThanOrEqual(MATCH_THRESHOLD);
  });

  test("respects the start offset", async () => {
    const { page } = harness;
    await page.evaluate((hls) => {
      window.__fixture.playback.currentTime = 3;
      window.__fixture.mount({
        frameAccurate: true,
        hls,
        start: { seconds: 2 },
      });
    }, BBB);
    expect(await waitForFrame(page, REFERENCE_FRAMES[1])).toBeLessThanOrEqual(
      MATCH_THRESHOLD,
    );

    await seek(page, 9.5);
    expect(await waitForFrame(page, REFERENCE_FRAMES[7.5])).toBeLessThanOrEqual(
      MATCH_THRESHOLD,
    );
  });

  test("preloads only as far as the requested lead time", async () => {
    const { page, requests } = harness;
    requests.length = 0;
    await page.evaluate((hls) => {
      window.__fixture.unmount();
      window.__fixture.playback.currentTime = 0;
      window.__fixture.mount({ frameAccurate: true, hls, preload: 25 });
    }, BBB);
    await waitForFrame(page, REFERENCE_FRAMES[0]);
    await page.waitForFunction(() => {
      const { buffered } = window.__fixture.playback;
      return buffered.length > 0 && buffered.end(buffered.length - 1) > 25;
    });

    expect(requests).toContain("/tests/big-buck-bunny/hls/stream4.ts");
    expect(requests).not.toContain("/tests/big-buck-bunny/hls/stream5.ts");
  });
});
