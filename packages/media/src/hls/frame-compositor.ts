// Worker-safe: must not import React or DOM-only code.
import type { VideoSample } from "mediabunny";

import {
  disposeKeyedCanvas,
  type GreenScreenCanvas,
  type HexColor,
  renderKeyedFrame,
} from "./greenscreen-render.ts";

export type KeyingOptions = Readonly<{
  color: HexColor;
  tolerance: number;
}>;

type Context2d = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Draws decoded video samples to a canvas, optionally keying them. */
export class FrameCompositor {
  private __context: Context2d | null = null;
  private __rotated: OffscreenCanvas | null = null;

  constructor(
    private readonly __canvas: GreenScreenCanvas,
    private readonly __keying: KeyingOptions | null,
  ) {}

  /** @returns whether the sample was drawn */
  draw(sample: VideoSample): boolean {
    const width = sample.displayWidth;
    const height = sample.displayHeight;
    if (width === 0 || height === 0) return false;

    if (this.__keying) {
      renderKeyedFrame({
        canvas: this.__canvas,
        color: this.__keying.color,
        source: this.__keyingSource(sample),
        tolerance: this.__keying.tolerance,
      });
      return true;
    }

    if (this.__canvas.width !== width || this.__canvas.height !== height) {
      this.__canvas.width = width;
      this.__canvas.height = height;
    }
    this.__context ??= this.__canvas.getContext("2d", {
      colorSpace: "srgb",
    }) as Context2d | null;
    if (!this.__context) return false;
    sample.draw(this.__context, 0, 0, width, height);
    return true;
  }

  dispose(): void {
    disposeKeyedCanvas(this.__canvas);
    this.__context = null;
    this.__rotated = null;
  }

  private __keyingSource(
    sample: VideoSample,
  ): VideoFrame | HTMLCanvasElement | OffscreenCanvas {
    if (sample.rotation === 0 && !sample.flip) {
      return sample.toCanvasImageSource() as VideoFrame | OffscreenCanvas;
    }
    // Uploading a frame directly to a texture ignores rotation metadata.
    const width = sample.displayWidth;
    const height = sample.displayHeight;
    this.__rotated ??= new OffscreenCanvas(width, height);
    if (this.__rotated.width !== width || this.__rotated.height !== height) {
      this.__rotated.width = width;
      this.__rotated.height = height;
    }
    const context = this.__rotated.getContext("2d");
    if (context) sample.draw(context, 0, 0, width, height);
    return this.__rotated;
  }
}
