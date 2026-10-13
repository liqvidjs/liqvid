// Decodes and composites HLS frames off the main thread. Frames are sent to
// the page as ImageBitmaps, which it displays without copying.
import { FrameCompositor } from "./frame-compositor.ts";
import type {
  FrameWorkerRequest,
  FrameWorkerResponse,
} from "./frame-protocol.ts";
import {
  createFrameSession,
  type FrameRenderer,
  ReadyState,
} from "./frame-session.ts";

// The package compiles against the DOM lib, which lacks worker globals.
const scope = globalThis as unknown as {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<FrameWorkerRequest>) => void,
  ): void;
  close(): void;
  postMessage(message: FrameWorkerResponse, transfer?: Transferable[]): void;
};

let renderer: FrameRenderer | null = null;
let compositor: FrameCompositor | null = null;

function post(message: FrameWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

function postError(message: string, error: unknown): void {
  try {
    post({ error, message, type: "error" });
  } catch {
    // Some errors can't be cloned.
    post({ error: String(error), message, type: "error" });
  }
}

scope.addEventListener("message", ({ data }) => {
  switch (data.type) {
    case "load": {
      const canvas = new OffscreenCanvas(1, 1);
      const frameCompositor = new FrameCompositor(canvas, data.greenscreen);
      compositor = frameCompositor;
      renderer = createFrameSession({
        draw(sample) {
          if (!frameCompositor.draw(sample)) {
            return false;
          }
          const bitmap = canvas.transferToImageBitmap();
          post({ bitmap, type: "frame" }, [bitmap]);
          return true;
        },
        initialTimestamp: data.initialTimestamp,
        onBuffered(ranges) {
          post({ ranges, type: "buffered" });
        },
        onError: postError,
        onReadyState(readyState) {
          // Frames carry their own ready state, so the page can report it
          // only once the frame is on screen.
          if (readyState === ReadyState.HAVE_CURRENT_DATA) {
            return;
          }
          post({ readyState, type: "readyState" });
        },
        preload: data.preload,
        source: data.source,
      });
      break;
    }
    case "render":
      renderer?.render(data.timestamp);
      break;
    case "seek":
      renderer?.seek(data.timestamp, data.playing);
      break;
    case "dispose":
      renderer?.dispose();
      compositor?.dispose();
      renderer = null;
      compositor = null;
      scope.close();
      break;
  }
});
