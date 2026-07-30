import type { ReplayData } from "@liqvid/utils";
import type {
  SerializedSchema,
  TLArrowShape,
  TLBookmarkShape,
  TLDrawShape,
  TLDrawShapeSegment,
  TLEmbedShape,
  TLStoreSnapshot,
  UnknownRecord,
  VecModel,
} from "@tldraw/editor";

import type { DiffRecord } from "./diff/index.ts";

export type Point3 = [x: number, y: number, z?: number];

// compressed events
export type PointerCoords = [number, number];

// shapes
export type ShapeKey = `shape:${string}`;
export type ShapeUpdate = { [key: ShapeKey]: DiffRecord };
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
  snapshot: TLStoreSnapshot;
};

// actions
export type TldrawAction = {
  diff?: DiffRecord;
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

export type DecodedTLShape =
  | DecodedTLDrawShape
  | TLArrowShape
  | TLBookmarkShape
  | TLEmbedShape;

export type DecodedTLSerializedStore = {
  [key: `shape:${string}`]: DecodedTLShape;
};

export type DecodedStoreSnapshot = {
  /** The serialized store data */
  store: DecodedTLSerializedStore;

  /** The serialized schema information */
  schema: SerializedSchema;
};

// export type TldrawPointerEvent = [number, number];
// export type TldrawShapeEvent = [`shape:${string}`, TLShape | null];
// export type TldrawInstanceEvent = ["instance", object];

// export type TldrawEvent =
//   | TldrawInstanceEvent
//   | TldrawPointerEvent
//   | TldrawShapeEvent
//   | StoreSnapshot<TLRecord>;
