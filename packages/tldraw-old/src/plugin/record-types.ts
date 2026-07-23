import type {TLCamera, TLInstance, TLRecord, TLShapeId} from "@tldraw/tldraw";
import type {CameraCoords, CurrentTool, PointerCoords} from "./types";

export function isInstance(
  key: string,
  _data: unknown,
): _data is {u: TLInstance} {
  return key === "instance";
}

export function isPointer(data: unknown): data is PointerCoords {
  return (
    Array.isArray(data) &&
    data.length === 2 &&
    typeof data[0] === "number" &&
    typeof data[1] === "number"
  );
}

export function isCameraCoords(data: unknown): data is CameraCoords {
  return (
    Array.isArray(data) &&
    data.length === 3 &&
    typeof data[0] === "number" &&
    typeof data[1] === "number" &&
    typeof data[2] === "number"
  );
}

export function isShape(key: string): key is `shape:${string}` & TLShapeId {
  return key.startsWith("shape:");
}

export function isCurrentTool(data: unknown): data is CurrentTool {
  return typeof data === "string";
}
