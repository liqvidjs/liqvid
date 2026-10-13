import type { KeyingOptions } from "./frame-compositor.ts";

/** Messages from the page to the frame worker. */
export type FrameWorkerRequest =
  | Readonly<{
      greenscreen: KeyingOptions | null;
      initialTimestamp: number;
      preload?: number;
      /** Absolute URL; relative URLs would resolve against the worker. */
      source: string;
      type: "load";
    }>
  | Readonly<{ timestamp: number; type: "render" }>
  | Readonly<{ playing: boolean; timestamp: number; type: "seek" }>
  | Readonly<{ type: "dispose" }>;

/** Messages from the frame worker to the page. */
export type FrameWorkerResponse =
  | Readonly<{ bitmap: ImageBitmap; type: "frame" }>
  | Readonly<{ readyState: number; type: "readyState" }>
  | Readonly<{
      ranges: readonly (readonly [number, number])[];
      type: "buffered";
    }>
  | Readonly<{ error: unknown; message: string; type: "error" }>;
