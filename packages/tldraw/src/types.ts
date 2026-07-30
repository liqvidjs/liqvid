import type { ObjectDiff } from "@liqvid/diff";
import type { ReplayData } from "@liqvid/utils";
import type {
  SerializedSchema,
  TLDrawShape,
  TLDrawShapeSegment,
  TLPageId,
  TLShape,
  TLStoreSnapshot,
  VecModel,
} from "@tldraw/editor";

export type Point3 = [x: number, y: number, z?: number];

/** A pointer position in tldraw canvas coordinates (decoded, in memory). */
export type Pointer = [x: number, y: number];

// compressed events

/**
 * A compressed pointer event: a base64-encoded pointer position (see
 * {@link encodePointer}). Stored as a bare string, which distinguishes it
 * from the object-valued shape events.
 */
export type PointerEvent = string;

// shapes
export type ShapeKey = `shape:${string}`;
export type ShapeUpdate = { [key: ShapeKey]: ObjectDiff<unknown> };

// pages
export type PageKey = `page:${string}`;
/**
 * A page event, keyed by page id:
 * - an object diff creates/updates (e.g. renames) a page,
 * - `0` deletes it.
 */
export type PageEvent = { [key: PageKey]: ObjectDiff<unknown> | 0 };

/**
 * The author's viewport in tldraw coordinates: the current page and the
 * camera position/zoom on that page. Stored under the `v` key so it is
 * unambiguous with the object-valued shape/page events and the bare-string
 * pointer events.
 */
export type Viewport = {
  /** The current page. */
  page: TLPageId;
  /** Camera position and zoom: `[x, y, z]`. */
  camera: [x: number, y: number, z: number];
};
export type ViewportEvent = { v: Partial<Viewport> };

/**
 * A segment append: the point(s) added to the end of a draw shape's path.
 *
 * The value is stored in whichever representation is smaller:
 * - a raw {@link Point3} (single point) or {@link Point3}[] (multiple), or
 * - a base64 string (see {@link encodePoints}), which wins for longer runs.
 */
export type ShapeAppend = {
  [key: ShapeKey]: Point3 | Point3[] | string;
};
export type ShapeRemove = { [key: ShapeKey]: 0 };

export type TldrawEvent =
  | PageEvent
  | PointerEvent
  | ShapeAppend
  | ShapeRemove
  | ShapeUpdate
  | ViewportEvent;
export type TldrawData = {
  version: "1.0";
  initialState: ReplayState;
  data: ReplayData<TldrawEvent>;
};

// state
export type ReplayState = {
  /** The author's pointer position in canvas coordinates. */
  pointer: Pointer;

  /**
   * The author's viewport (current page + camera). This is the viewport the
   * replay follows by default.
   */
  viewport: Viewport;

  /**
   * The store snapshot. In memory during replay, the vectors in this snapshot
   * are decoded (see {@link decodeStore}); tldraw's own snapshots keep them
   * base64-encoded.
   */
  snapshot: TLStoreSnapshot;
};

// actions
export type TldrawAction = {
  /** A diff applied to the in-memory store snapshot (shapes and pages). */
  diff?: ObjectDiff<unknown>;
  /** The author's pointer position in canvas coordinates. */
  pointer?: Pointer;
  /** A change to the author's viewport (current page and/or camera). */
  viewport?: Partial<Viewport>;
};

/* ------------------------------ decoded shapes ------------------------------ */

export type DecodedTLDrawShapeSegment = Omit<TLDrawShapeSegment, "path"> & {
  path: readonly VecModel[];
};

export type DecodedTLDrawShape = Omit<TLDrawShape, "props"> & {
  props: Omit<TLDrawShape["props"], "segments"> & {
    segments: DecodedTLDrawShapeSegment[];
  };
};

export type DecodedTLShape = DecodedTLDrawShape | Exclude<TLShape, TLDrawShape>;

export type DecodedTLSerializedStore = {
  [key: `shape:${string}`]: DecodedTLShape;
};

export type DecodedStoreSnapshot = {
  /** The serialized store data */
  store: DecodedTLSerializedStore;

  /** The serialized schema information */
  schema: SerializedSchema;
};
