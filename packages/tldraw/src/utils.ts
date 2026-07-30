/* eslint-disable @typescript-eslint/no-explicit-any */
// export type ObjectDifference<T> = {
//   /** Added */
//   a?: Partial<T>;

import { b64Vecs, isShape, type TLSerializedStore, type TLShape } from "tldraw";

import { isDrawShape } from "./record-types.ts";
import type {
  DecodedTLDrawShapeSegment,
  DecodedTLSerializedStore,
  DecodedTLShape,
} from "./types.ts";

//   /** Removed */
//   r?: Partial<T>;

//   /** Updated */
//   u?: Partial<T>;
// };

// export function objDiff<T extends object>(a: T, b: T): ObjectDifference<T> {
//   const keysA = Object.keys(a) as (keyof T)[];
//   const keysB = new Set<keyof T>(Object.keys(b) as (keyof T)[]);

//   const data: ObjectDifference<T> = {};

//   for (const key of keysA) {
//     if (!keysB.has(key)) {
//       data.r ??= {};
//       data.r[key] = a[key];
//       continue;
//     }

//     const valueA = a[key];
//     const valueB = b[key];

//     if (!cmp(valueA, valueB)) {
//       data.u ??= {};
//       data.u[key] = valueB;
//     }
//     keysB.delete(key);
//   }

//   for (const key of keysB.values()) {
//     data.a ??= {};
//     data.a[key] = b[key];
//   }

//   return data;
// }

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
    } catch (e) {
      // tried to access cross-domain stylesheet
    }
  }
}

function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return rule.constructor.name === "CSSStyleRule";
}

export function assertSameType<K>(a: unknown, b: K): asserts a is K {
  a;
  b;
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
