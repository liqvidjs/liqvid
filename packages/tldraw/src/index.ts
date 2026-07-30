import {
  applyDiff,
  creationDiff,
  deletePlaceholder,
  deletionDiff,
  invertDiff,
  matchRunes,
  mergeDiffs,
  type ObjectDiff,
  objectDiff,
  objectKeys,
} from "@liqvid/diff";
import { assertType } from "@liqvid/utils";
import type { Editor, TLDrawShape, TLShapeId, TLStoreSnapshot } from "tldraw";

import { defaultShape } from "./defaults.ts";
import { makeReplayPlugin } from "./plugin-utils.ts";
import { isDrawShape, isPointer, isShape } from "./record-types.ts";
import type {
  DecodedTLShape,
  Point3,
  ReplayState,
  ShapeKey,
  TldrawAction,
  TldrawEvent,
} from "./types.ts";
import {
  type CursorName,
  decodeDiffPaths,
  decodeStore,
  encodeShape,
  encodeStore,
  isSingleton,
} from "./utils.ts";
import { segmentAppend } from "./zsa.ts";

export type {
  ReplayState,
  TldrawAction,
  TldrawData,
  TldrawEvent,
} from "./types.ts";

export type PointerHandler = (args: {
  kind?: CursorName;
  x?: number;
  y?: number;
}) => void;

type TldrawProps = {
  /** Element to sync with */
  editor: Editor;

  /** Handle cursor updates */
  handlePointer: PointerHandler;

  /** Return whether the camera should follow the author. */
  isFollowing: () => boolean;
};

type TldrawHistory = {
  shapes?: Map<string, DecodedTLShape>;
};

export const tldrawReplay = makeReplayPlugin<
  TldrawEvent,
  ReplayState,
  TldrawAction,
  TldrawProps,
  TldrawHistory
>({
  apply: (state, action) => {
    const clone = structuredClone(state);
    if (action.pointer) {
      clone.pointer = action.pointer;
    }

    if (action.diff) {
      // The in-memory store keeps vectors decoded, so diffs (which are also
      // decoded) can be applied directly.
      clone.snapshot.store = applyDiff(
        clone.snapshot.store,
        // biome-ignore lint/suspicious/noExplicitAny: store is a decoded snapshot
        action.diff as any,
        // biome-ignore lint/suspicious/noExplicitAny: store is a decoded snapshot
      ) as any;
    }

    return clone;
  },

  // blank state
  blankState: () => ({ pointer: [0, 0], snapshot: {} as TLStoreSnapshot }),

  // commit
  commit(action, { editor, handlePointer }) {
    editor.store.mergeRemoteChanges(() => {
      // pointer
      if (action.pointer) {
        const [x, y] = action.pointer;
        handlePointer({ x, y });
      }

      // state diffs
      if (action.diff) {
        const runedKeys = objectKeys(action.diff ?? {});
        for (const runedKey of runedKeys) {
          matchRunes(action.diff, runedKey, {
            create(key, value) {
              if (isShape(key)) {
                assertType<DecodedTLShape>(value);
                // tldraw expects base64-encoded vectors
                editor.createShape({ ...encodeShape(value), isLocked: true });
              }
            },
            delete(key) {
              if (isShape(key)) {
                editor.updateShape({
                  id: key as TLShapeId,
                  isLocked: false,
                  type: editor.getShape(key as TLShapeId)?.type ?? "draw",
                });
                editor.deleteShape(key as TLShapeId);
              }
            },
            object(key, update) {
              if (isShape(key)) {
                // validation
                const shape = editor.store.get(key as TLShapeId);
                if (!shape) {
                  console.warn(`Expected shape: ${runedKey}`);
                  return;
                }

                if (!isDrawShape(shape)) {
                  console.warn(`Cannot append to non-draw shape: ${runedKey}`);
                  return;
                }

                // apply the diff to the decoded shape, then re-encode the
                // vectors before handing the result to tldraw
                const decoded = decodeStore({ [key]: shape })[
                  key
                ] as DecodedTLShape;
                const next = applyDiff(
                  decoded,
                  // biome-ignore lint/suspicious/noExplicitAny: decoded shape diff
                  update as any,
                ) as DecodedTLShape;
                editor.updateShape<TLDrawShape>(
                  encodeShape(next) as TLDrawShape,
                );
              }
            },
          });
        }
      }
    });
  },

  // decompress
  decompress: (datum, history) => {
    history.shapes ??= new Map();

    if (isPointer(datum)) {
      return { pointer: datum };
    }

    // get unique key
    const keys = Object.keys(datum) as ShapeKey[];
    if (!isSingleton(keys)) {
      return {};
    }
    const key = keys[0];

    // shape commands
    if (isShape(key)) {
      const update = datum[key]!;

      // shape remove
      if (update === deletePlaceholder) {
        history.shapes.delete(key);
        return { diff: deletionDiff(key) };
      }
      // shape append
      else if (Array.isArray(update)) {
        if (update.length === 0) {
          console.error("Expected non-empty array");
          return {};
        }

        if (typeof update[0] === "number") {
          assertType<Point3>(update);
          return { diff: objectDiff(key, segmentAppend([update])) };
        } else {
          assertType<Point3[]>(update);
          return { diff: objectDiff(key, segmentAppend(update)) };
        }
      }
      // shape create / update. Decode any base64 vectors so the diff can be
      // merged and applied in memory.
      const decodedUpdate = decodeDiffPaths(update) as ObjectDiff<unknown>;

      // shape create
      if (!history.shapes.has(key)) {
        const shape = applyDiff(defaultShape, decodedUpdate) as DecodedTLShape;
        history.shapes.set(key, shape);
        return { diff: creationDiff(key, shape) };
      }
      // shape update
      return { diff: objectDiff(key, decodedUpdate) };
    }

    return {};
  },

  // initialize
  initialize(state, props) {
    // Decode the stored (base64) snapshot for in-memory use, but load the
    // re-encoded snapshot into tldraw, which expects base64 vectors.
    const decodedStore = decodeStore(state.snapshot.store);
    const decodedState: ReplayState = {
      ...state,
      snapshot: {
        ...state.snapshot,
        store: decodedStore,
      } as unknown as TLStoreSnapshot,
    };

    props.editor.store.loadStoreSnapshot({
      ...state.snapshot,
      store: encodeStore(decodedStore),
    });

    return decodedState;
  },

  // invert
  invert(state, action) {
    const inverse: TldrawAction = {};

    if (action.pointer) {
      inverse.pointer = state.pointer;
    }

    if (action.diff) {
      inverse.diff = invertDiff(state.snapshot.store, action.diff);
    }

    return inverse;
  },

  // merge
  merge(...actions) {
    return actions.reduce((acc, curr) => {
      const diff = mergeDiffs(acc.diff ?? {}, curr.diff ?? {});
      Object.assign(acc, curr);
      acc.diff = diff;
      return acc;
    }, {});
  },
});
