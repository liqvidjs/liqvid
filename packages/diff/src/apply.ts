import type {ArrayDiff, ObjectDiff} from "./types";
import {matchItemDiff, matchRunes, objectKeys} from "./utils";

/**
 * Apply a diff to an object.
 * @param a - The object to apply the diff to.
 * @param b - The diff to apply.
 * @returns A new object with the diff applied.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyDiff<T>(a: T, b: ObjectDiff<T>): T {
  const copy = structuredClone(a);

  for (const rkey of objectKeys(b)) {
    matchRunes(b, rkey, {
      create(key, item) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        copy[key] = item as any;
      },
      delete(key) {
        delete copy[key];
      },
      array(key, item) {
        const target = copy[key];

        if (!Array.isArray(target)) {
          throw new TypeError("Expected array");
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        copy[key] = applyArrayDiff(target, item) as any;
      },
      object(key, item) {
        const target = copy[key];

        if (typeof target !== "object" || target === null) {
          throw new TypeError("Expected object");
        }

        copy[key] = applyDiff(target, item);
      },
      change(key, item) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        copy[key] = item as any;
      },
    });
  }

  return copy;
}

/**
 * Apply a diff to an array.
 * @param arr - The array to apply the diff to.
 * @param diff - The diff to apply.
 * @returns A new array with the diff applied.
 */
export function applyArrayDiff<T>(arr: T[], diff: ArrayDiff<T>): T[] {
  const [delta, itemDiffs = [], ...appends] = diff;
  const copy = arr.slice();

  for (const diff of itemDiffs) {
    matchItemDiff(diff, {
      set(offset, item) {
        copy[copy.length - offset] = item as T;
      },
      array(offset, item) {
        copy[copy.length - offset] = applyArrayDiff(
          copy[copy.length - offset] as unknown[],
          item
        ) as T;
      },
      object(offset, item) {
        copy[copy.length - offset] = applyDiff(
          copy[copy.length - offset],
          item
        ) as T;
      },
    });
  }

  if (delta < 0) {
    copy.splice(copy.length + delta, -delta);
  } else {
    for (const append of appends) {
      copy.push(append as T);
    }
  }

  return copy;
}
