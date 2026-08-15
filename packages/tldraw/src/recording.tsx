import { diffObjects } from "@liqvid/diff";
import { type RecordingPlugin, ReplayDataRecorder } from "@liqvid/recording";
import type { ReplayData } from "@liqvid/utils";
import { assertType, bind } from "@liqvid/utils";
import type {
  Editor,
  HistoryEntry,
  RecordsDiff,
  TLPage,
  TLPageId,
  TLRecord,
  TLShape,
  TLStoreSnapshot,
  UnknownRecord,
} from "tldraw";

import { getDefaultShape } from "./defaults.ts";
import { isCamera, isPage, isShape } from "./record-types.ts";
import type {
  DecodedTLShape,
  Point3,
  Pointer,
  TldrawEvent,
  Viewport,
} from "./types.ts";
import {
  decodeShape,
  encodeAppend,
  encodeDiffPaths,
  encodePointer,
} from "./utils.ts";
import { extractSegmentAppend, isSegmentAppend } from "./zsa.ts";

type TldrawState = {
  containerWidth: number;
  pointer: Pointer;
  viewport: Viewport;
  snapshot: TLStoreSnapshot;
};

export class TldrawRecorder extends ReplayDataRecorder<
  TldrawEvent,
  TldrawState
> {
  #editor: Editor | undefined;
  #unlisten: (() => void) | undefined;
  #unlistenPointer: (() => void) | undefined;
  #shapeCache: Map<string, DecodedTLShape> = new Map();
  #pageCache: Map<string, TLPage> = new Map();

  /**
   * The author's last-recorded viewport, so that changes can be diffed and
   * only the changed parts emitted.
   */
  #viewport: Viewport | undefined;

  /**
   * Most recent pointer position in canvas coordinates. Tracked continuously
   * (not just during recording) so that we know where the cursor is when
   * recording begins — which is typically triggered by a keydown, not a
   * pointer event.
   */
  #pointer: Pointer = [0, 0];

  readonly package = "@lqv/tldraw";
  readonly version = "1.0.0";

  constructor() {
    super();
    bind(this, ["captureEvent", "trackPointer"]);
  }

  override beginRecording(): void {
    // DO NOT FORGET TO CALL super
    super.beginRecording();

    if (!this.#editor) {
      throw new Error("TldrawRecorder: editor not provided");
    }

    // seed the page cache from the current store so page updates can be diffed
    this.#pageCache.clear();
    for (const page of this.#editor.getPages()) {
      this.#pageCache.set(page.id, page);
    }

    this.#viewport = this.#readViewport();

    this.initial = {
      // container width for viewport scaling on replay
      containerWidth: this.#editor.getContainer().clientWidth,
      // most recent pointer position, in canvas coordinates
      pointer: this.#pointer,
      snapshot: this.#editor.store.getStoreSnapshot("all"),
      // the author's viewport (current page + camera)
      viewport: this.#viewport,
    };
    this.#unlisten = this.#editor.store.listen(this.captureEvent);
  }

  override endRecording(): void {
    this.#unlisten?.();
    this.#shapeCache.clear();
    this.#pageCache.clear();
    this.#viewport = undefined;
  }

  /** Read the author's current viewport (current page + camera). */
  #readViewport(): Viewport {
    const editor = this.#editor!;
    const { x, y, z } = editor.getCamera();
    return { camera: [x, y, z], page: editor.getCurrentPageId() };
  }

  provideEditor(editor: Editor) {
    // stop tracking the previous editor, if any
    this.#unlistenPointer?.();

    this.#editor = editor;

    // Track the pointer position continuously so the initial pointer is known
    // at the moment recording begins.
    const container = editor.getContainer();
    container.addEventListener("pointermove", this.trackPointer);
    this.#unlistenPointer = () =>
      container.removeEventListener("pointermove", this.trackPointer);
  }

  /**
   * Remember the latest pointer position in canvas coordinates, and — while
   * recording — capture it as an event.
   *
   * tldraw 5.x keeps the live pointer in `editor.inputs` rather than writing
   * it to the `pointer:pointer` store record on every move, so listening to
   * the store does not surface pointer motion. We track it from the DOM
   * `pointermove` instead.
   */
  trackPointer(event: globalThis.PointerEvent): void {
    if (!this.#editor) return;
    const { x, y } = this.#editor.screenToPage({
      x: event.clientX,
      y: event.clientY,
    });
    this.#pointer = [x, y];

    if (this.active && !this.paused) {
      this.capture(undefined, encodePointer(this.#pointer));
    }
  }

  captureEvent({ changes }: HistoryEntry): void {
    if (!this.#editor) return;

    for (const compressed of this.#compressChanges(this.#editor, changes)) {
      this.capture(undefined, compressed);
    }
  }

  #compressChanges(
    editor: Editor,
    changes: RecordsDiff<UnknownRecord>,
  ): TldrawEvent[] {
    const events: TldrawEvent[] = [];

    /**
     * The viewport change accumulated across this batch. tldraw often writes
     * the camera and `currentPageId` in the same transaction, so we coalesce
     * them into a single viewport event.
     */
    const viewport: Partial<Viewport> = {};

    // new records
    for (const [key, created] of Object.entries(changes.added)) {
      switch (true) {
        case isShape(key): {
          assertType<TLShape>(created);

          const decoded = decodeShape(created);
          // diff the decoded shape, then re-encode the vectors so the stored
          // diff stays compact (base64)
          events.push({
            [key]: encodeDiffPaths(diffObjects(getDefaultShape(), decoded)),
          });
          this.#shapeCache.set(created.id, decoded);
          break;
        }
        // a new page
        case isPage(key): {
          assertType<TLPage>(created);
          events.push({ [key]: diffObjects({} as Partial<TLPage>, created) });
          this.#pageCache.set(created.id, created);
          break;
        }
      }
    }

    // updated records
    for (const [key, update] of Object.entries(changes.updated)) {
      const [, to] = update as [TLRecord, TLRecord];

      switch (true) {
        // pointer motion is captured from the DOM (see `trackPointer`), not
        // the store, so there is nothing to do here for pointer records.
        case to.typeName === "pointer":
          break;
        // shape
        case isShape(key): {
          assertType<TLShape>(to);

          const decodedTo = decodeShape(to);

          const shape = this.#shapeCache.get(to.id);
          if (shape) {
            const diff = diffObjects(shape, decodedTo);

            // appending to a shape is a common event so we compress it
            if (isSegmentAppend(diff)) {
              const points = extractSegmentAppend(diff).map(
                (p): Point3 => [p.x, p.y, p.z ?? 0.5],
              );
              // store whichever of the raw / base64 forms is smaller
              events.push({ [key]: encodeAppend(points) });
            } else {
              // re-encode vectors as base64 to keep the recording compact
              events.push({ [key]: encodeDiffPaths(diff) });
            }
          } else {
            // TODO: is this necessary? what happens if the shape exists before recording,
            // we need to initialize the shape cache better
            events.push({
              [key]: encodeDiffPaths(diffObjects(getDefaultShape(), decodedTo)),
            });
          }
          this.#shapeCache.set(to.id, decodedTo);
          break;
        }
        // a page rename (or other page-record change)
        case isPage(key): {
          assertType<TLPage>(to);
          const prev = this.#pageCache.get(to.id);
          const diff = diffObjects(prev ?? {}, to);
          if (Object.keys(diff).length > 0) {
            events.push({ [key]: diff });
          }
          this.#pageCache.set(to.id, to);
          break;
        }
        // the current page's camera moved. Each page has its own camera
        // record (`camera:<pageId>`); only follow the current page's camera.
        case isCamera(to): {
          if (to.id === `camera:${editor.getCurrentPageId()}`) {
            const { x, y, z } = to;
            viewport.camera = [x, y, z];
          }
          break;
        }
        // the author switched pages
        case to.typeName === "instance": {
          const from = update[0] as TLRecord & { currentPageId?: TLPageId };
          const next = to as TLRecord & { currentPageId?: TLPageId };
          if (
            next.currentPageId !== undefined &&
            next.currentPageId !== from.currentPageId
          ) {
            viewport.page = next.currentPageId;
          }
          break;
        }
      }
    }

    // removed records
    for (const [key, removed] of Object.entries(changes.removed)) {
      switch (true) {
        case isShape(key):
          events.push({ [key]: 0 });
          this.#shapeCache.delete(removed.id);
          break;
        // a deleted page
        case isPage(key):
          events.push({ [key]: 0 });
          this.#pageCache.delete(removed.id);
          break;
      }
    }

    // emit a single coalesced viewport event, if anything changed
    if (viewport.camera || viewport.page) {
      this.#applyViewportDelta(viewport);
      events.push({ v: viewport });
    }

    return events;
  }

  /** Update the tracked viewport with a (partial) delta. */
  #applyViewportDelta(delta: Partial<Viewport>): void {
    if (!this.#viewport) return;
    if (delta.camera) this.#viewport.camera = delta.camera;
    if (delta.page) this.#viewport.page = delta.page;
  }
}

const icon = (props: React.ComponentProps<"svg">) => (
  <svg height="1000" viewBox="0 0 1000 1000" {...props}>
    <path
      clipRule="evenodd"
      d="M 0,130 C 0,58 58.000027,0 129.99963,0 h 740 c 72,0 130.00297,58 130.00297,130 v 740 c 0,72 -58.00297,130 -130.00297,130 h -740 C 58.000027,1000 0,942 0,870 Z m 589.99963,170 c 0,50 -40,90 -90,90 -50,0 -90,-40 -90,-90 0,-50 40,-90 90,-90 50,0 90,40 90,90 z m -120,510 c 43,0 84,-59 99,-91 19,-41 30,-114 11,-157 -13,-30 -43,-52 -83,-52 -48,0 -87,39 -87,87 0,43 31,77 71,84 2,0 4,3 4,5 -4,25 -15,57 -32,73 -21,20 -15,51 17,51 z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

export const TldrawRecording: RecordingPlugin<
  [number, TldrawEvent],
  ReplayData<TldrawEvent>,
  TldrawRecorder
> = {
  icon,
  name: "Tldraw",
  package: "@lqv/tldraw",
  recorder: new TldrawRecorder(),
  title: "Record Tldraw",
};
