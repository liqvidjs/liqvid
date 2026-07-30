import type { ObjectDiff } from "@liqvid/diff";
import type { ReplayData } from "@liqvid/utils";
import type {
  SerializedSchema,
  TLDrawShape,
  TLDrawShapeSegment,
  TLShape,
  TLStoreSnapshot,
  VecModel,
} from "@tldraw/editor";

export type Point3 = [x: number, y: number, z?: number];

// compressed events
export type PointerCoords = [number, number];

// shapes
export type ShapeKey = `shape:${string}`;
export type ShapeUpdate = { [key: ShapeKey]: ObjectDiff<unknown> };
export type ShapeAppend = {
  [key: ShapeKey]: Point3 | Point3[];
};
export type ShapeRemove = { [key: ShapeKey]: 0 };

export type TldrawEvent =
  | PointerCoords
  | ShapeAppend
  | ShapeRemove
  | ShapeUpdate;
export type TldrawData = {
  version: "1.0";
  initialState: ReplayState;
  data: ReplayData<TldrawEvent>;
};

// state
export type ReplayState = {
  pointer: [number, number];

  /**
   * The store snapshot. In memory during replay, the vectors in this snapshot
   * are decoded (see {@link decodeStore}); tldraw's own snapshots keep them
   * base64-encoded.
   */
  snapshot: TLStoreSnapshot;
};

// actions
export type TldrawAction = {
  diff?: ObjectDiff<unknown>;
  pointer?: [number, number];
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
