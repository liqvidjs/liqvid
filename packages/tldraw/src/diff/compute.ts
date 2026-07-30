import { assertType } from "@liqvid/utils";
import { b64Vecs } from "tldraw";

import {
  arrayItemDiff,
  creationDiff,
  deletionDiff,
  objectItemDiff,
  setDiff,
  updateArrayDiff,
  updateObjectDiff,
} from "./builders.ts";
import type { ArrayDiff, DiffRecord } from "./types.ts";
import { cmp } from "./utils.ts";

/** Compute the diff between two arrays. */
export function arrDiff(a: unknown[], b: unknown[]): ArrayDiff {
  // diffs
  const itemDiffs: Exclude<ArrayDiff[1], undefined> = [];

  for (let i = 0; i < Math.min(a.length, b.length); ++i) {
    const itemA = a[i];
    const itemB = b[i];

    const offset = a.length - i;

    if (!cmp(itemA, itemB)) {
      // simple replace
      if (
        typeof itemA !== typeof itemB ||
        typeof itemA === "bigint" ||
        typeof itemA === "boolean" ||
        typeof itemA === "number" ||
        typeof itemA === "string" ||
        itemA === null ||
        itemB === null ||
        Array.isArray(itemA) !== Array.isArray(itemB)
      ) {
        itemDiffs.push([offset, itemB]);
        continue;
      }

      if (Array.isArray(itemA)) {
        assertType<unknown[]>(itemB);
        itemDiffs.push(arrayItemDiff(offset, arrDiff(itemA, itemB)));
      } else {
        assertType<Record<string, unknown>>(itemA);
        assertType<Record<string, unknown>>(itemB);
        itemDiffs.push(objectItemDiff(offset, objDiff(itemA, itemB)));
      }
    }
  }

  const delta = b.length - a.length;

  // pure deletion
  if (itemDiffs.length === 0 && delta <= 0) {
    return [delta];
  } else {
    return [b.length - a.length, itemDiffs, ...b.slice(a.length)];
  }
}

/**
 * Compute the diff between two objects.
 */
export function objDiff(a: object, b: object): DiffRecord {
  assertType<Record<string, unknown>>(a);
  assertType<Record<string, unknown>>(b);

  const ret: DiffRecord = {};

  const keysA = Object.keys(a);
  const keysB = new Set(Object.keys(b));

  for (const key of keysA) {
    if (!keysB.has(key)) {
      Object.assign(ret, deletionDiff(key));
      continue;
    }

    const valueA = a[key] as unknown;
    const valueB = b[key] as unknown;

    if (typeof valueA !== typeof valueB) {
      console.warn("Expected same type");
    } else {
      if (!cmp(valueA, valueB)) {
        switch (typeof valueA) {
          case "string":
          case "number":
          case "boolean":
          case "bigint":
            Object.assign(ret, setDiff(key, valueB));
            break;
          case "object":
            if (
              valueA === null ||
              valueB === null ||
              Array.isArray(valueA) !== Array.isArray(valueB)
            ) {
              Object.assign(ret, setDiff(key, valueB));
            } else if (Array.isArray(valueA)) {
              assertType<unknown[]>(valueB);
              Object.assign(ret, updateArrayDiff(key, arrDiff(valueA, valueB)));
            } else {
              assertType<object>(valueB);
              Object.assign(
                ret,
                updateObjectDiff(key, objDiff(valueA, valueB)),
              );
            }
            break;
        }
      }
    }

    keysB.delete(key);
  }

  for (const key of keysB) {
    Object.assign(ret, creationDiff(key, b[key]));
  }

  return ret;
}
