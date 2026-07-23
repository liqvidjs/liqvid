import type {ObjectDiff} from "@liqvid/diff";
import type {ReplayData} from "@liqvid/utils/replay-data";
import type {TLShape, TLStoreSnapshot} from "@tldraw/editor";

export type CurrentTool = string;
export type Point3 = [x: number, y: number, z?: number];

// compressed events
export type PointerCoords = [x: number, y: number];
export type CameraCoords = [x: number, y: number, z: number];

// shapes
export type ShapeKey = `shape:${string}`;
export type ShapeUpdate = {[key: ShapeKey]: ObjectDiff<TLShape>};
export type ShapeAppend = {
  [key: ShapeKey]: Point3 | Point3[];
};
export type ShapeRemove = {[key: ShapeKey]: 0};

export type TldrawEvent =
  | CameraCoords
  | CurrentTool
  | PointerCoords
  | ShapeAppend
  | ShapeRemove
  | ShapeUpdate;

export type TldrawData = {
  version: "1.0";
  initialState: ReplayState;
  data: ReplayData<TldrawEvent>;
};

export type PointerState = {
  x: number;
  y: number;
  tool: string;
};

// state
export interface ReplayState  {
  pointer: PointerState;
  snapshot: TLStoreSnapshot;
};

// actions
export type TldrawAction = ObjectDiff<ReplayState>;

export type TldrawHistory = {
  shapes?: Map<string, TLShape>;
};