import {
  b64Vecs,
  isShape,
  type TLSerializedStore,
  type TLShape,
  type VecModel,
} from "tldraw";

import { isDrawShape } from "./record-types.ts";
import type {
  DecodedTLDrawShapeSegment,
  DecodedTLSerializedStore,
  DecodedTLShape,
} from "./types.ts";

const CURSOR_NAMES = ["cross"] as const;
export type CursorName = (typeof CURSOR_NAMES)[number];

export interface CursorInfo {
  image: string;
  x: number;
  y: number;
}

/**
 * Get the SVGs for Tldraw's various cursor types
 */
export function getCursorSvgs(): Map<CursorName, CursorInfo> {
  const map = new Map<CursorName, CursorInfo>();

  for (const rule of getTlcontainerStyleRules()) {
    for (const name of CURSOR_NAMES) {
      const value = rule.style.getPropertyValue(`--tl-cursor-${name}`);
      const $_ = value.match(
        /^(?<url>.+\))\s+(?<x>\d+) (?<y>\d+),\s+(?<fallback>[a-z-]+)$/,
      )!;

      const groups = $_?.groups as
        | Record<"url" | "x" | "y" | "fallback", string>
        | undefined;
      if (!groups) continue;

      map.set(name, {
        image: groups.url,
        x: parseFloat(groups.x),
        y: parseFloat(groups.y),
      });
    }
  }

  return map;
}

/** Find CSS rules matching .tl-container */
function* getTlcontainerStyleRules() {
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (!isStyleRule(rule)) continue;
        if (rule.selectorText !== ".tl-container") continue;

        yield rule;
      }
    } catch {
      // tried to access cross-domain stylesheet
    }
  }
}

function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return rule.constructor.name === "CSSStyleRule";
}

export function isSingleton<T>(value: T[]): value is [T] {
  return value.length === 1;
}

export function decodeShape(shape: TLShape): DecodedTLShape {
  switch (shape.type) {
    case "draw":
      return {
        ...shape,
        props: {
          ...shape.props,
          segments: shape.props.segments.map(
            (segment): DecodedTLDrawShapeSegment => ({
              ...segment,
              path: b64Vecs.decodePoints2D(segment.path),
            }),
          ),
        },
      };
  }

  return shape;
}

export function decodeStore(
  store: TLSerializedStore,
): DecodedTLSerializedStore {
  return Object.fromEntries(
    Object.entries(store).map(([key, record]) => {
      if (isShape(record)) {
        if (isDrawShape(record)) {
          return [key, decodeShape(record)];
        }
      }

      return [key, record];
    }),
  );
}

/**
 * Re-encode a decoded shape's vectors as base64.
 * Inverse of {@link decodeShape}: tldraw expects base64-encoded paths when
 * loading store state.
 */
export function encodeShape(shape: DecodedTLShape): TLShape {
  switch (shape.type) {
    case "draw":
      return {
        ...shape,
        props: {
          ...shape.props,
          segments: shape.props.segments.map((segment) => ({
            ...segment,
            path: b64Vecs.encodePoints2D(segment.path as VecModel[]),
          })),
        },
      } as TLShape;
  }

  return shape as TLShape;
}

/**
 * Re-encode all decoded vectors in a store as base64.
 * Inverse of {@link decodeStore}.
 */
export function encodeStore(
  store: DecodedTLSerializedStore,
): TLSerializedStore {
  return Object.fromEntries(
    Object.entries(store).map(([key, record]) => {
      if (isShape(record) && isDrawShape(record)) {
        return [key, encodeShape(record)];
      }
      return [key, record];
    }),
  ) as TLSerializedStore;
}

/**
 * The key under which draw-shape vector paths are stored in a segment.
 * When decoded these are {@link VecModel} arrays; when encoded they are
 * base64 strings.
 */
const PATH_KEY = "path";

/**
 * Recursively walk a value (typically a diff or a shape), converting any
 * `path` field between its base64-encoded and decoded representations.
 *
 * This is used to keep stored diffs compact (base64) while operating on
 * decoded vectors in memory.
 *
 * @param value - The value to transform (mutated copy is returned).
 * @param direction - `"decode"` turns base64 strings into {@link VecModel}
 *   arrays; `"encode"` does the reverse.
 */
// biome-ignore lint/suspicious/noExplicitAny: recursive structural walk
function transformPaths(value: any, direction: "decode" | "encode"): any {
  if (Array.isArray(value)) {
    return value.map((item) => transformPaths(item, direction));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  // biome-ignore lint/suspicious/noExplicitAny: recursive structural walk
  const out: any = {};
  for (const [key, child] of Object.entries(value)) {
    // A `path` key holds a full array of vectors. This occurs for the bare
    // `path` field (inside a segment) and for whole-array diff keys such as
    // `+path` (create) and `=path` (change). When encoding, the array of
    // VecModels becomes a base64 string; when decoding, the base64 string
    // becomes an array of VecModels.
    //
    // Note we deliberately do NOT match `#path` (an array *diff*) or `@path`
    // (an object diff), whose values are diff structures rather than plain
    // vector arrays — those are recursed into normally.
    if (isFullPathKey(key)) {
      if (direction === "encode" && Array.isArray(child)) {
        out[key] = b64Vecs.encodePoints2D(child as VecModel[]);
        continue;
      }
      if (direction === "decode" && typeof child === "string") {
        out[key] = b64Vecs.decodePoints2D(child);
        continue;
      }
    }

    out[key] = transformPaths(child, direction);
  }

  return out;
}

/**
 * Whether a (possibly runed) diff key refers to a whole `path` vector array.
 *
 * Matches the bare `path` field and the create/change runed variants
 * (`+path`, `=path`), but not array/object diff variants (`#path`, `@path`).
 */
function isFullPathKey(key: string): boolean {
  return key === PATH_KEY || key === `+${PATH_KEY}` || key === `=${PATH_KEY}`;
}

/**
 * Re-encode the vectors inside a shape diff as base64, to keep recordings
 * compact. Operates structurally so it handles creation diffs, `path`
 * changes, and nested segment updates alike.
 */
export function encodeDiffPaths<T>(diff: T): T {
  return transformPaths(diff, "encode");
}

/**
 * Decode the base64 vectors inside a shape diff back into {@link VecModel}
 * arrays, so that diffs can be merged and applied in memory.
 */
export function decodeDiffPaths<T>(diff: T): T {
  return transformPaths(diff, "decode");
}
