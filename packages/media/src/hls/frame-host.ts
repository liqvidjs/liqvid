import { FrameCompositor, type KeyingOptions } from "./frame-compositor.ts";
import type {
  FrameWorkerRequest,
  FrameWorkerResponse,
} from "./frame-protocol.ts";
import {
  createFrameSession,
  type FrameRenderer,
  ReadyState,
} from "./frame-session.ts";

export type FrameHostOptions = Readonly<{
  canvas: HTMLCanvasElement;
  greenscreen: KeyingOptions | null;
  initialTimestamp: number;
  onError: (message: string, error: unknown) => void;
  onBuffered: (ranges: readonly (readonly [number, number])[]) => void;
  onReadyState: (readyState: number) => void;

  preloadSeconds?: number;
  /** Absolute URL of the HLS playlist. */
  source: string;
}>;

/**
 * Render HLS frames to a canvas, decoding in a worker where supported and
 * falling back to the main thread otherwise.
 */
export function createFrameHost(options: FrameHostOptions): FrameRenderer {
  if (supportsWorkerRendering()) {
    try {
      return createWorkerFrameHost(options);
    } catch {
      // e.g. blocked by a Content Security Policy
    }
  }
  return createMainThreadFrameHost(options);
}

function supportsWorkerRendering(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    "transferToImageBitmap" in OffscreenCanvas.prototype &&
    typeof ImageBitmapRenderingContext !== "undefined"
  );
}

function createMainThreadFrameHost(options: FrameHostOptions): FrameRenderer {
  const compositor = new FrameCompositor(options.canvas, options.greenscreen);
  const session = createFrameSession({
    draw: (sample) => compositor.draw(sample),
    initialTimestamp: options.initialTimestamp,
    onBuffered: options.onBuffered,
    onError: options.onError,
    onReadyState: options.onReadyState,
    preload: options.preloadSeconds,
    source: options.source,
  });
  return {
    dispose() {
      session.dispose();
      compositor.dispose();
    },
    render: session.render,
    seek: session.seek,
  };
}

function createWorkerFrameHost(options: FrameHostOptions): FrameRenderer {
  const { canvas } = options;
  const worker = new Worker(new URL("./frame-worker.ts", import.meta.url), {
    name: "liqvid-hls-frames",
    type: "module",
  });
  let context: ImageBitmapRenderingContext | null = null;
  let disposed = false;
  let fallback: FrameRenderer | null = null;
  let receivedFrame = false;
  // Replayed if the worker fails to start.
  let lastCall: (() => void) | null = null;

  const send = (message: FrameWorkerRequest) => worker.postMessage(message);

  // Each message is a separate task in the worker, so a burst of seeks would
  // start decoding the first before the last arrives. Coalesce calls made in
  // the same task: only the latest of consecutive seeks/renders matters.
  let queue: FrameWorkerRequest[] = [];
  const enqueue = (message: FrameWorkerRequest) => {
    if (queue.length === 0) {
      queueMicrotask(() => {
        const messages = queue;
        queue = [];
        if (disposed || fallback) return;
        for (const queued of messages) send(queued);
      });
    }
    if (queue.at(-1)?.type === message.type) queue[queue.length - 1] = message;
    else queue.push(message);
  };

  worker.addEventListener("message", ({ data }) => {
    const message = data as FrameWorkerResponse;
    if (disposed) {
      if (message.type === "frame") message.bitmap.close();
      return;
    }
    switch (message.type) {
      case "frame":
        receivedFrame = true;
        if (canvas.width !== message.bitmap.width) {
          canvas.width = message.bitmap.width;
        }
        if (canvas.height !== message.bitmap.height) {
          canvas.height = message.bitmap.height;
        }
        context ??= canvas.getContext("bitmaprenderer");
        if (!context) {
          message.bitmap.close();
          options.onReadyState(ReadyState.HAVE_ENOUGH_DATA);
          return;
        }
        context.transferFromImageBitmap(message.bitmap);
        options.onReadyState(ReadyState.HAVE_CURRENT_DATA);
        break;
      case "readyState":
        options.onReadyState(message.readyState);
        break;
      case "buffered":
        options.onBuffered(message.ranges);
        break;
      case "error":
        options.onError(message.message, message.error);
        break;
    }
  });

  // The worker script failed to load or crashed during startup. Unless the
  // canvas already shows worker frames, take over on the main thread.
  worker.addEventListener("error", (event) => {
    if (disposed) return;
    worker.terminate();
    if (receivedFrame || fallback) {
      options.onError("HLS frame worker failed", event.error ?? event.message);
      return;
    }
    fallback = createMainThreadFrameHost(options);
    lastCall?.();
  });

  send({
    greenscreen: options.greenscreen,
    initialTimestamp: options.initialTimestamp,
    preload: options.preloadSeconds,
    source: options.source,
    type: "load",
  });

  return {
    dispose() {
      disposed = true;
      fallback?.dispose();
      send({ type: "dispose" });
    },
    render(timestamp) {
      lastCall = () => fallback?.render(timestamp);
      if (fallback) fallback.render(timestamp);
      else enqueue({ timestamp, type: "render" });
    },
    seek(timestamp, playing) {
      lastCall = () => fallback?.seek(timestamp, playing);
      if (fallback) fallback.seek(timestamp, playing);
      else enqueue({ playing, timestamp, type: "seek" });
    },
  };
}
