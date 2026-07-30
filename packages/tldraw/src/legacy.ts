import type {
  Editor,
  StoreSnapshot,
  TLRecord,
  TLShape,
  TLShapeId,
} from "tldraw";

import { objDiff } from "./diff/index.ts";
import { makeReplayPlugin } from "./plugin-utils.ts";
import { isInstance, isPointer, isShape } from "./record-types.ts";
import type {
  TldrawData,
  TldrawEvent,
  TldrawPointerEvent,
  TldrawShapeEvent,
} from "./recording.tsx";
import { applyDiff, type CursorName } from "./utils.ts";

type TLPointer = Extract<TLRecord, { typeName: "pointer" }>;

export type PointerHandler = (args: {
  kind?: CursorName;
  x?: number;
  y?: number;
}) => void;

export const tldrawReplay = makeReplayPlugin<
  TldrawEvent,
  {
    /** Element to sync with */
    editor: Editor;

    /** Handle cursor updates */
    handlePointer: PointerHandler;
  },
  StoreSnapshot<TLRecord>["store"]
>({
  commit(event: TldrawEvent, { editor, handlePointer }) {
    return;
    editor.store.mergeRemoteChanges(() => {});
    return;
    if (isPointer(event)) {
      handlePointer({ x: event[0], y: event[1] });
      return;
    }

    const [type, update] = event;
    switch (true) {
      case isInstance(type, update):
        //   editor.updateInstanceState(applyDiff(editor.instanceState, update));
        return;
      case isShape(type, update): {
        const shape = editor.store.get(type as TLShapeId);

        // new shape
        if (!shape) {
          editor.createShape(update);
          return;
        }

        // delete shape
        if (update === null) {
          editor.deleteShape(shape.id);
          return;
        }
        // update shape
        editor.updateShape({
          id: shape.id,
          props: applyDiff(shape, update).props,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }
    }
  },
  initialize(snapshots, { editor, handlePointer }) {
    if (snapshots.length !== 1) {
      console.error("Expected exactly one snapshot");
    }

    editor.store.mergeRemoteChanges(() => {
      for (const snapshot of snapshots) {
        // pointer state
        const pointerState = (snapshot.store as any)["pointer:pointer"] as
          | TLPointer
          | undefined;
        if (pointerState) {
          handlePointer(pointerState);
        }
        delete (snapshot.store as any)["pointer:pointer"];

        // rest of the snapshot
        console.log("loading snapshot", snapshot);
        editor.store.loadSnapshot(snapshot);
      }
    });
  },
  initialState: () => ({}),
  invert(data: TldrawData): TldrawEvent[] {
    const inverses: TldrawEvent[] = [];

    // states to keep track of
    let pointerState: TldrawPointerEvent | undefined;
    const shapeCache = new Map<string, TLShape>();

    for (let i = 0; i < data.length; ++i) {
      const event = data[i][1];

      let inverse: TldrawEvent;

      // first pointer event defines the initial state
      if (isPointer(event)) {
        inverse = pointerState ?? event;
        pointerState = event;
      } else {
        // https://github.com/microsoft/TypeScript/issues/26916
        const [type, update] = event;
        switch (true) {
          // shape event
          case isShape(type, update):
            {
              const shape = shapeCache.get(type);

              if (shape) {
                // shape deleted
                if (update === null) {
                  inverse = [type, shape];
                }
                // shape updated
                else {
                  const newShape = applyDiff(shape, update);
                  inverse = [
                    type,
                    objDiff(newShape, shape),
                  ] as TldrawShapeEvent;
                  shapeCache.set(type, newShape);
                }
              }
              // shape added
              else {
                inverse = [type, null] as TldrawShapeEvent;
                shapeCache.set(type, update);
              }
            }
            break;
          default:
            inverse = event;
        }
      }

      inverses.push(inverse);
    }

    return inverses;
  },
});
