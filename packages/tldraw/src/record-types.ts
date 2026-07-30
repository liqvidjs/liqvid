import type {
  StoreSnapshot,
  TLCamera,
  TLDrawShape,
  TLInstance,
  TLRecord,
  TLUnknownShape,
} from "tldraw";

import type { PointerCoords, TldrawEvent } from "./types.ts";

export function isCamera(data: TLRecord): data is TLCamera {
  return data.typeName === "camera";
}

export function isInstance(
  key: string,
  _data: unknown,
): _data is { u: TLInstance } {
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

export function isShape(key: string): key is `shape:${string}` {
  return key.startsWith("shape:");
}

export function isSnapshot(data: TldrawEvent): data is StoreSnapshot<TLRecord> {
  return "store" in data;
}

export function isDrawShape(data: TLUnknownShape): data is TLDrawShape {
  return data.type === "draw";
}
