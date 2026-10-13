import type { Page } from "puppeteer-core";

export const BBB = "/tests/big-buck-bunny/stream.m3u8";
export const GREENSCREEN = "/tests/greenscreen/stream.m3u8";

export const REFERENCE_FRAMES = {
  0: "/tests/big-buck-bunny/frame_0s.png",
  1: "/tests/big-buck-bunny/frame_1s.png",
  5: "/tests/big-buck-bunny/frame_5s.png",
  7.5: "/tests/big-buck-bunny/frame_7s_500ms.png",
} as const;

export type ReferenceTime = keyof typeof REFERENCE_FRAMES;

/** Mean absolute per-channel difference (0-255) below which frames match. */
export const MATCH_THRESHOLD = 6;

/** PNG screenshot of the rendered canvas, with transparency preserved. */
export async function captureCanvas(page: Page): Promise<string> {
  const canvas = await page.waitForSelector("canvas");
  const data = await canvas!.screenshot({
    encoding: "base64",
    omitBackground: true,
  });
  return `data:image/png;base64,${data}`;
}

/** Mean absolute RGB difference between two images (data or page URLs). */
export function imageDifference(
  page: Page,
  a: string,
  b: string,
): Promise<number> {
  return page.evaluate(
    async (a, b) => {
      const load = async (url: string) =>
        createImageBitmap(await (await fetch(url)).blob());
      const [imageA, imageB] = await Promise.all([load(a), load(b)]);
      if (imageA.width !== imageB.width || imageA.height !== imageB.height) {
        return Number.POSITIVE_INFINITY;
      }
      const read = (image: ImageBitmap) => {
        const canvas = new OffscreenCanvas(image.width, image.height);
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      };
      const pixelsA = read(imageA);
      const pixelsB = read(imageB);
      let total = 0;
      for (let i = 0; i < pixelsA.length; i += 4) {
        total +=
          Math.abs(pixelsA[i]! - pixelsB[i]!) +
          Math.abs(pixelsA[i + 1]! - pixelsB[i + 1]!) +
          Math.abs(pixelsA[i + 2]! - pixelsB[i + 2]!);
      }
      return total / ((pixelsA.length / 4) * 3);
    },
    a,
    b,
  );
}

/** RGBA value of a pixel in an image (data or page URL). */
export function pixelAt(
  page: Page,
  image: string,
  x: number,
  y: number,
): Promise<[number, number, number, number]> {
  return page.evaluate(
    async (image, x, y) => {
      const bitmap = await createImageBitmap(await (await fetch(image)).blob());
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      const [r, g, b, a] = context.getImageData(x, y, 1, 1).data;
      return [r!, g!, b!, a!] as [number, number, number, number];
    },
    image,
    x,
    y,
  );
}

/**
 * Poll the canvas until it matches `reference`, returning the final
 * difference (which is above the threshold on timeout).
 */
export async function waitForFrame(
  page: Page,
  reference: string,
  timeout = 10_000,
): Promise<number> {
  const deadline = Date.now() + timeout;
  let difference = Number.POSITIVE_INFINITY;
  while (Date.now() < deadline) {
    difference = await imageDifference(
      page,
      await captureCanvas(page),
      reference,
    );
    if (difference <= MATCH_THRESHOLD) return difference;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return difference;
}

/** Poll until the canvas stops changing, then return its last capture. */
export async function waitForStableCanvas(
  page: Page,
  timeout = 10_000,
): Promise<string> {
  const deadline = Date.now() + timeout;
  let previous = await captureCanvas(page);
  let stableSince = Date.now();
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const current = await captureCanvas(page);
    if (current !== previous) {
      previous = current;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= 500) {
      return current;
    }
  }
  return previous;
}

export function seek(page: Page, seconds: number): Promise<void> {
  return page.evaluate((seconds) => {
    window.__fixture.playback.currentTime = seconds;
  }, seconds);
}
