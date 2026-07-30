import type { ArrayDiff, DiffRecord } from "./types.ts";
import { matchItemDiff, matchRunes, objectKeys } from "./utils.ts";

/** Apply a diff to an object. */
export function applyDiff(a: any, b: DiffRecord): any {
  const copy = structuredClone(a);

  for (const rkey of objectKeys(b)) {
    matchRunes(b, rkey, {
      add(key, item) {
        copy[key] = item;
      },
      array(key, item) {
        console.debug({ item, key });
        const target = copy[key];

        if (!Array.isArray(target)) {
          throw new TypeError("Expected array");
        }

        copy[key] = applyArrayDiff(target, item);
      },
      delete(key) {
        delete copy[key];
      },
      object(key, item) {
        const target = copy[key];

        if (typeof target !== "object" || target === null) {
          throw new TypeError("Expected object");
        }

        copy[key] = applyDiff(target, item);
      },
      set(key, item) {
        copy[key] = item;
      },
    });
  }

  return copy;
}

/** Apply a diff to an array. */
export function applyArrayDiff<T>(arr: T[], diff: ArrayDiff): T[] {
  const [delta, itemDiffs = [], ...appends] = diff;
  const copy = arr.slice();

  for (const diff of itemDiffs) {
    matchItemDiff(diff, {
      array(offset, item) {
        copy[copy.length - offset] = applyArrayDiff(
          copy[copy.length - offset] as unknown[],
          item,
        ) as T;
      },
      object(offset, item) {
        copy[copy.length - offset] = applyDiff(
          copy[copy.length - offset],
          item,
        ) as T;
      },
      set(offset, item) {
        copy[copy.length - offset] = item as T;
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
