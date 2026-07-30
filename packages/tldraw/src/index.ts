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
import type {
  Editor,
  TLDrawShape,
  TLPage,
  TLPageId,
  TLShapeId,
  TLStoreSnapshot,
} from "tldraw";

import { defaultShape } from "./defaults.ts";
import type { FollowController } from "./follow.ts";
import { makeReplayPlugin } from "./plugin-utils.ts";
import { isPage, isPointer, isShape, isViewportEvent } from "./record-types.ts";
import type {
  DecodedTLShape,
  Point3,
  ReplayState,
  ShapeKey,
  TldrawAction,
  TldrawEvent,
  Viewport,
} from "./types.ts";
import {
  type CursorName,
  decodeDiffPaths,
  decodePointer,
  decodePoints,
  decodeStore,
  encodeShape,
  encodeStore,
  isSingleton,
} from "./utils.ts";
import { segmentAppend } from "./zsa.ts";

export { FollowController } from "./follow.ts";
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

  /** Controls whether the replay follows the author's viewport. */
  follow: FollowController;
};

type TldrawHistory = {
  shapes?: Map<string, DecodedTLShape>;
  pages?: Map<string, TLPage>;
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

    if (action.viewport) {
      clone.viewport = {
        camera: action.viewport.camera ?? clone.viewport.camera,
        page: action.viewport.page ?? clone.viewport.page,
      };
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
  blankState: () => ({
    pointer: [0, 0],
    snapshot: {} as TLStoreSnapshot,
    viewport: { camera: [0, 0, 1], page: "page:page" as TLPageId },
  }),

  // commit
  commit(action, { editor, handlePointer, follow }) {
    // `mergeRemoteChanges` marks these edits as remote so the recorder does
    // not capture them. `ignoreShapeLock` lets us mutate the replayed shapes,
    // which we lock to prevent viewer interaction — without it, tldraw
    // silently drops `updateShape` calls on locked shapes (so appends after
    // the initial `createShape` would never land).
    editor.store.mergeRemoteChanges(() => {
      editor.run(
        () => {
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
                    editor.createShape({
                      ...encodeShape(value),
                      isLocked: true,
                    });
                  } else if (isPage(key)) {
                    assertType<TLPage>(value);
                    editor.createPage(value);
                  }
                },
                delete(key) {
                  if (isShape(key)) {
                    editor.deleteShape(key as TLShapeId);
                  } else if (isPage(key)) {
                    editor.deletePage(key as TLPageId);
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

                    // Apply the diff to the decoded shape, then re-encode the
                    // vectors before handing the result to tldraw. For draw
                    // shapes this round-trips the base64 vector paths; for
                    // every other shape type (e.g. text) `decodeStore` /
                    // `encodeShape` are no-ops and the generic diff is applied
                    // as-is — this is what makes text create/resize/move
                    // updates replay correctly in real time (where they arrive
                    // as separate `object` updates rather than being merged
                    // into the initial `create`).
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
                  } else if (isPage(key)) {
                    // page rename (or other page-record change)
                    const page = editor.getPage(key as TLPageId);
                    if (!page) {
                      console.warn(`Expected page: ${runedKey}`);
                      return;
                    }
                    const next = applyDiff(
                      page,
                      // biome-ignore lint/suspicious/noExplicitAny: page diff
                      update as any,
                    ) as TLPage;
                    editor.updatePage(next);
                  }
                },
              });
            }
          }
        },
        { ignoreShapeLock: true },
      );
    });

    // viewport (page + camera). Applied outside `mergeRemoteChanges` so that
    // the resulting camera/page change is genuine editor state; the follow
    // controller ignores its own changes when detecting viewer input.
    if (action.viewport) {
      follow.setAuthorViewport(action.viewport);
    }
  },

  // decompress
  decompress: (datum, history) => {
    history.shapes ??= new Map();
    history.pages ??= new Map();

    if (isPointer(datum)) {
      return { pointer: decodePointer(datum) };
    }

    // viewport (author's page + camera)
    if (isViewportEvent(datum)) {
      return { viewport: datum.v };
    }

    // get unique key. Shape/page events are single-key records; index into
    // them generically (the union of value types is narrowed per branch).
    const record = datum as Record<string, unknown>;
    const keys = Object.keys(record) as ShapeKey[];
    if (!isSingleton(keys)) {
      return {};
    }
    const key = keys[0];

    // shape commands
    if (isShape(key)) {
      const update = record[key] as
        | ObjectDiff<unknown>
        | Point3
        | Point3[]
        | string
        | typeof deletePlaceholder;

      // shape remove
      if (update === deletePlaceholder) {
        history.shapes.delete(key);
        return { diff: deletionDiff(key) };
      }
      // shape append (base64-encoded run of points)
      else if (typeof update === "string") {
        return { diff: objectDiff(key, segmentAppend(decodePoints(update))) };
      }
      // shape append (raw points)
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

    // page commands
    if (isPage(key)) {
      const update = record[key] as ObjectDiff<TLPage> | 0 | undefined;

      // page remove
      if (
        // biome-ignore lint/suspicious/noExplicitAny: sentinel comparison
        (update as any) === deletePlaceholder ||
        update === 0 ||
        update === undefined
      ) {
        history.pages.delete(key);
        return { diff: deletionDiff(key) };
      }

      // page create
      if (!history.pages.has(key)) {
        const page = applyDiff({} as TLPage, update);
        history.pages.set(key, page);
        return { diff: creationDiff(key, page) };
      }
      // page update (e.g. rename)
      return { diff: objectDiff(key, update) };
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
      viewport: state.viewport ?? {
        camera: (({ x, y, z }) => [x, y, z] as Viewport["camera"])(
          props.editor.getCamera(),
        ),
        page: props.editor.getCurrentPageId(),
      },
    };

    props.editor.store.loadStoreSnapshot({
      ...state.snapshot,
      store: encodeStore(decodedStore),
    });

    // Lock every shape from the initial store snapshot so the viewer cannot
    // modify it. (Shapes created later during replay are locked as they are
    // created; see the `create` handler in `commit`.) We lock across all pages,
    // not just the current one, by walking the loaded snapshot's shape records.
    const shapeIds = objectKeys(decodedStore).filter((k) =>
      isShape(k as string),
    ) as TLShapeId[];
    props.editor.store.mergeRemoteChanges(() => {
      props.editor.run(
        () => {
          props.editor.updateShapes(
            shapeIds
              .map((id) => props.editor.getShape(id))
              .filter((shape) => shape && !shape.isLocked)
              .map((shape) => ({
                id: shape!.id,
                isLocked: true,
                type: shape!.type,
              })),
          );
        },
        { ignoreShapeLock: true },
      );
    });

    // Seed the follow controller with the author's initial viewport and snap
    // the editor to it (following is on by default).
    props.follow.setAuthorViewport(decodedState.viewport);

    // position the cursor at the initial pointer
    const [x, y] = state.pointer;
    props.handlePointer({ x, y });

    return decodedState;
  },

  // invert
  invert(state, action) {
    const inverse: TldrawAction = {};

    if (action.pointer) {
      inverse.pointer = state.pointer;
    }

    if (action.viewport) {
      // restore the parts of the viewport this action changed
      inverse.viewport = {};
      if (action.viewport.page !== undefined) {
        inverse.viewport.page = state.viewport.page;
      }
      if (action.viewport.camera !== undefined) {
        inverse.viewport.camera = state.viewport.camera;
      }
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
      const viewport =
        acc.viewport || curr.viewport
          ? { ...acc.viewport, ...curr.viewport }
          : undefined;
      Object.assign(acc, curr);
      acc.diff = diff;
      if (viewport) acc.viewport = viewport;
      return acc;
    }, {});
  },
});
