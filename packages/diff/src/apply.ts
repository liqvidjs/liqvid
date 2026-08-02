/** biome-ignore-all lint/suspicious/noExplicitAny: deep type magic */
import type { ArrayDiff, ObjectDiff } from "./types.ts";
import { matchItemDiff, matchRunes, objectKeys } from "./utils.ts";

/**
 * Deep-clone a value taken from a diff before inserting it into the target.
 *
 * `create`/`change`/`set`/append operations copy values straight out of the
 * diff. Storing them by reference would alias the diff's internal data into the
 * (mutable) target, so a later in-place edit of the target would silently
 * corrupt the diff itself — and any other structure that shares it. Cloning on
 * insertion keeps diffs immutable no matter how the result is subsequently
 * mutated.
 */
function cloneValue<V>(value: V): V {
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as V;
}

/**
 * Apply a diff to an object.
 * @param a - The object to apply the diff to.
 * @param b - The diff to apply.
 * @param inPlace - Whether to apply the diff in place or return a new object.
 * @returns A new object with the diff applied.
 */
export function applyDiff<T>(a: T, b: ObjectDiff<T>, inPlace = false): T {
  const copy =
    inPlace && !Object.isFrozen(a) ? a : JSON.parse(JSON.stringify(a));

  for (const rkey of objectKeys(b)) {
    matchRunes(b, rkey, {
      array(key, item) {
        const target = copy[key];

        if (!Array.isArray(target)) {
          throw new TypeError("Expected array");
        }

        applyArrayDiff(target, item, true);
      },
      change(key, item) {
        copy[key] = cloneValue(item) as any;
      },
      create(key, item) {
        copy[key] = cloneValue(item) as any;
      },
      delete(key) {
        delete copy[key];
      },
      object(key, item) {
        const target = copy[key];

        if (typeof target !== "object" || target === null) {
          throw new TypeError("Expected object");
        }

        applyDiff(target, item, true);
      },
    });
  }

  return copy;
}

/**
 * Apply a diff to an array.
 * @param arr - The array to apply the diff to.
 * @param diff - The diff to apply.
 * @param inPlace - Whether to apply the diff in place or return a new array.
 * @returns A new array with the diff applied.
 */
export function applyArrayDiff<T>(
  arr: T[],
  diff: ArrayDiff<T>,
  inPlace = false,
): T[] {
  const [delta, itemDiffs = [], ...appends] = diff;
  const copy = inPlace ? arr : arr.slice();

  for (const diff of itemDiffs) {
    matchItemDiff(diff, {
      array(offset, item) {
        applyArrayDiff(
          copy[copy.length - offset] as unknown[],
          item,
          true,
        ) as T;
      },
      object(offset, item) {
        applyDiff(copy[copy.length - offset], item, true) as T;
      },
      set(offset, item) {
        copy[copy.length - offset] = cloneValue(item) as T;
      },
    });
  }

  if (delta < 0) {
    copy.splice(copy.length + delta, -delta);
  } else {
    for (const append of appends) {
      copy.push(cloneValue(append) as T);
    }
  }

  return copy;
}
