import { diffObjects } from "@liqvid/diff";
import { type RecordingPlugin, ReplayDataRecorder } from "@liqvid/recording";
import type { ReplayData } from "@liqvid/utils";
import { assertType, bind } from "@liqvid/utils";
import type {
  Editor,
  HistoryEntry,
  RecordsDiff,
  TLRecord,
  TLShape,
  TLStoreSnapshot,
  UnknownRecord,
} from "tldraw";

import { defaultShape } from "./defaults.ts";
import { isShape } from "./record-types.ts";
import type { DecodedTLShape, Point3, TldrawEvent } from "./types.ts";
import { decodeShape, encodeDiffPaths, isSingleton } from "./utils.ts";
import { extractSegmentAppend, isSegmentAppend } from "./zsa.ts";

type TldrawState = {
  pointer: [x: number, y: number];
  snapshot: TLStoreSnapshot;
};

export class TldrawRecorder extends ReplayDataRecorder<
  TldrawEvent,
  TldrawState
> {
  #editor: Editor | undefined;
  #unlisten: (() => void) | undefined;
  #shapeCache: Map<string, DecodedTLShape> = new Map();

  readonly package = "@lqv/tldraw";
  readonly version = "1.0.0";

  constructor() {
    super();
    bind(this, ["captureEvent"]);
  }

  override beginRecording(): void {
    // DO NOT FORGET TO CALL super
    super.beginRecording();

    if (!this.#editor) {
      throw new Error("TldrawRecorder: editor not provided");
    }

    this.initial = {
      // TODO: set correct initial pointer position
      pointer: [0, 0],
      snapshot: this.#editor.store.getStoreSnapshot("all"),
    };
    this.#unlisten = this.#editor.store.listen(this.captureEvent);
  }

  override endRecording(): void {
    this.#unlisten?.();
    this.#shapeCache.clear();
  }

  provideEditor(editor: Editor) {
    this.#editor = editor;
  }

  captureEvent({ changes }: HistoryEntry): void {
    if (!this.#editor) return;

    // console.info(changes);
    // if (Object.keys(changes.removed).length > 0) {
    // console.log(changes.updated);
    // }

    for (const compressed of this.#compressChanges(changes)) {
      this.capture(undefined, compressed);
    }
  }

  #compressChanges(changes: RecordsDiff<UnknownRecord>): TldrawEvent[] {
    const events: TldrawEvent[] = [];
    // new records
    for (const [key, created] of Object.entries(changes.added)) {
      switch (true) {
        case isShape(key): {
          assertType<TLShape>(created);

          const decoded = decodeShape(created);
          // diff the decoded shape, then re-encode the vectors so the stored
          // diff stays compact (base64)
          events.push({
            [key]: encodeDiffPaths(diffObjects(defaultShape, decoded)),
          });
          this.#shapeCache.set(created.id, decoded);
          break;
        }
      }
    }

    // updated records
    for (const [key, update] of Object.entries(changes.updated)) {
      const [, to] = update as [TLRecord, TLRecord];

      switch (true) {
        // pointer
        case to.typeName === "pointer":
          events.push([to.x, to.y]);
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
              const points = extractSegmentAppend(diff);
              if (isSingleton(points)) {
                const p = points[0];
                events.push({
                  [key]: typeof p.z === "number" ? [p.x, p.y, p.z] : [p.x, p.y],
                });
              } else {
                events.push({
                  [key]: points.map(
                    (p): Point3 =>
                      typeof p.z === "number" ? [p.x, p.y, p.z] : [p.x, p.y],
                  ),
                });
              }
            } else {
              // re-encode vectors as base64 to keep the recording compact
              events.push({ [key]: encodeDiffPaths(diff) });
            }
          } else {
            // TODO: is this necessary? what happens if the shape exists before recording,
            // we need to initialize the shape cache better
            events.push({
              [key]: encodeDiffPaths(diffObjects(defaultShape, decodedTo)),
            });
          }
          this.#shapeCache.set(to.id, decodedTo);
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
      }
    }

    return events;
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
