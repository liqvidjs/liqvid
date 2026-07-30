import type { TLCamera, TLDrawShape, TLRecord, TLUnknownShape } from "tldraw";

import type { PointerEvent, ViewportEvent } from "./types.ts";

export function isCamera(data: TLRecord): data is TLCamera {
  return data.typeName === "camera";
}

/**
 * A compressed pointer event is a base64 string (see {@link encodePointer}),
 * distinguishing it from the object-valued shape events.
 */
export function isPointer(data: unknown): data is PointerEvent {
  return typeof data === "string";
}

/**
 * A viewport event is an object with a single `v` key holding the (partial)
 * author viewport (page and/or camera).
 */
export function isViewportEvent(data: unknown): data is ViewportEvent {
  return (
    typeof data === "object" &&
    data !== null &&
    "v" in data &&
    Object.keys(data).length === 1
  );
}

export function isShape(key: string): key is `shape:${string}` {
  return key.startsWith("shape:");
}

export function isPage(key: string): key is `page:${string}` {
  return key.startsWith("page:");
}

export function isDrawShape(data: TLUnknownShape): data is TLDrawShape {
  return data.type === "draw";
}
