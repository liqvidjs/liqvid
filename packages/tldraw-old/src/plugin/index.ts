import {
  applyDiff,
  invertDiff,
  matchRunes,
  mergeDiffs,
  type ObjectDiff,
} from "@liqvid/diff";
import {assertType} from "@liqvid/utils/types";
import type {
  Editor,
  SerializedStore,
  TLRecord,
  TLShape,
  TLShapeId,
  TLStoreSnapshot,
  VecModel,
} from "@tldraw/tldraw";

import {decompress} from "./compression";
import {makeReplayPlugin} from "./plugin-utils";
import {isShape} from "./record-types";
import type {
  PointerState,
  ReplayState,
  TldrawEvent,
  TldrawHistory,
} from "./types";
import {objectKeys} from "./utils";

export type PointerHandler = (args: Partial<PointerState>) => void;

type TldrawProps = {
  /** Element to sync with */
  editor: Editor;

  /** Handle cursor updates */
  handlePointer: PointerHandler;

  /** Return whether the camera should follow the author. */
  isFollowing: () => boolean;
};

export const tldrawReplay = makeReplayPlugin<
  TldrawEvent,
  ReplayState,
  ObjectDiff<ReplayState>,
  TldrawProps,
  TldrawHistory
>({
  apply: applyDiff,
  blankState: () => ({
    pointer: {x: 0, y: 0, tool: "select"},
    snapshot: {} as TLStoreSnapshot,
  }),
  decompress,
  initialize(state, props) {
    props.editor.store.loadSnapshot(state.snapshot);
  },
  invert: invertDiff,
  merge: (...actions) => actions.reduce(mergeDiffs, {}),

  // commit
  commit(action, {editor, handlePointer, isFollowing}) {
    editor.store.mergeRemoteChanges(() => {
      editor.batch(() => {
        for (const key of objectKeys(action)) {
          matchRunes(action, key, {
            object(key, value) {
              // pointer updates
              if (key === "pointer") {
                const args: Partial<PointerState> = {};
                if ("=x" in value) {
                  args.x = value["=x"] as number;
                }
                if ("=y" in value) {
                  args.y = value["=y"] as number;
                }
                if ("=tool" in value) {
                  args.tool = value["=tool"] as string;
                }
                handlePointer(args);
              } else if (key === "snapshot") {
                const diff = value["@store"] as ObjectDiff<
                  SerializedStore<TLRecord>
                >;

                const runedKeys = objectKeys(diff ?? {});

                for (const runedKey of runedKeys) {
                  matchRunes(diff, runedKey, {
                    create(key, value) {
                      // create shape
                      if (isShape(key)) {
                        assertType<TLShape>(value);
                        editor.createShape({...value, isLocked: true});
                      }
                    },
                    delete(key) {
                      // delete shape
                      if (isShape(key)) {
                        editor.updateShape({
                          id: key as TLShapeId,
                          isLocked: false,
                          type: "",
                        });
                        editor.deleteShape(key as TLShapeId);
                      }
                    },
                    object(key, update) {
                      // camera update
                      if (key.startsWith("camera:")) {
                        if (!isFollowing()) return;

                        editor.setCamera(
                          applyDiff(
                            editor.getCamera(),
                            update as ObjectDiff<VecModel>,
                          ),
                        );
                      }
                      // shape update
                      else if (isShape(key)) {
                        // validation
                        const shape = editor.store.get(key as TLShapeId);
                        {
                          if (!shape) {
                            console.warn(`Expected shape: ${runedKey}`);
                            return;
                          }
                        }

                        editor.updateShape<TLShape>(applyDiff(shape, update));
                      }
                    },
                  });
                }
              }
            },
          });
        }
      });
    });
  },
});
