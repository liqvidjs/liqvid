import { assertType } from "@liqvid/utils";

import {
  arrayDiff,
  arrayItemDiff,
  changeDiff,
  changeItemDiff,
  creationDiff,
  deletionDiff,
  objectDiff,
  objectItemDiff,
} from "./builders.ts";
import { runes } from "./runes.ts";
import type {
  ArrayDiff,
  ItemDiff,
  ObjectDiff,
  Rune,
  RunedKey,
  RuneName,
} from "./types.ts";

/** Typed {@link Object.keys} */
export function objectKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/** Comparison function */
export function cmp(a: unknown, b: unknown): boolean {
  if (typeof a !== typeof b) return false;

  switch (typeof a) {
    case "bigint":
    case "boolean":
    case "function":
    case "number":
    case "string":
    case "symbol":
    case "undefined":
      return a === b;
  }

  if (a === null || b === null) return a === b;

  assertType<Record<string, unknown>>(a);
  assertType<Record<string, unknown>>(b);

  const keysA = Object.keys(a);
  const keysB = new Set(Object.keys(b));

  if (keysA.length !== keysB.size) return false;
  return keysA.every((key) => keysB.has(key) && cmp(a[key], b[key]));
}

/**
 * Pattern-match on an item diff.
 */
export function matchItemDiff<T, R>(
  [offset, item]: ItemDiff<T>,
  fns: {
    set?: (offset: number, value: unknown) => R;
    array?: (offset: number, value: ArrayDiff<T[number & keyof T]>) => R;
    object?: (offset: number, value: ObjectDiff<T[string & keyof T]>) => R;
  },
): R | undefined {
  if (typeof offset === "number") {
    return fns.set?.(offset, item);
  }

  const numeric = getOffset(offset);

  if (isRune(offset, runes.array)) {
    assertType<ArrayDiff<T[number & keyof T]>>(item);
    return fns?.array?.(numeric, item);
  } else if (isRune(offset, runes.object)) {
    assertType<ObjectDiff<T[string & keyof T]>>(item);
    return fns?.object?.(numeric, item);
  }
}

export function isRune<R extends Rune>(
  key: string,
  rune: R,
): key is `${R}${string}` {
  return key.startsWith(rune as string);
}

/** Pattern-match on an object diff. */
export function matchRunes<T, R>(
  diff: ObjectDiff<T>,
  key: keyof ObjectDiff<T>,
  fns: {
    [name in RuneName]?: (
      key: string & keyof T,
      rkey: ObjectDiff<T>[RunedKey<name>],
    ) => R;
  },
): R | undefined {
  for (const name of Object.keys(fns) as RuneName[]) {
    const rune = runes[name];
    if (key.startsWith(rune)) {
      const fn = fns[name];
      if (!fn) continue;
      // biome-ignore lint/suspicious/noExplicitAny: runed key/value are dynamically typed
      return fn(key.slice(rune.length) as any, diff[key] as any);
    }
  }
}

export function consume<T>(
  a: ObjectDiff<T>,
  key: string,
  fns: {
    [$name in RuneName | "else" | "none"]?: $name extends RuneName
      ? (value: ObjectDiff<T>[RunedKey<$name>]) => unknown
      : $name extends "else"
        ? <K extends RuneName>(
            name: K,
            value: ObjectDiff<T>[RunedKey<K>],
          ) => unknown
        : () => unknown;
  } = {},
) {
  for (const name of objectKeys(runes)) {
    const rune = runes[name];
    const keyA = `${rune}${key}` as const;

    if (!(keyA in a)) continue;

    const valueA = a[keyA];
    delete a[keyA];

    const fn = fns[name];
    if (fn) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return fn(valueA as any);
    }

    if (fns.else) {
      return fns.else(name, valueA);
    }
  }

  // if nothing matched
  return fns.none?.();
}

export function getOffset(offset: ItemDiff<unknown>[0]): number {
  if (typeof offset === "number") return offset;

  if (isRune(offset, runes.array)) {
    return parseInt(offset.slice(runes.array.length), 10);
  } else if (isRune(offset, runes.object)) {
    return parseInt(offset.slice(runes.object.length), 10);
  }

  throw new Error(`Invalid index: ${offset}`);
}

export function addToOffset<O extends ItemDiff<unknown>[0]>(
  offset: O,
  delta: number,
): O {
  const result = getOffset(offset) + delta;
  if (typeof offset === "number") return result as O;

  if (isRune(offset, runes.array)) {
    return `${runes.array}${result}` as O;
  }

  return `${runes.object}${result}` as O;
}

/**
 * Invert a diff with respect to an object.
 *
 * Given `state` (= A) and a diff describing A → B, produce the diff describing
 * B → A. Applying the returned diff to `applyDiff(state, diff)` reproduces
 * `state`.
 *
 * Note that it is not possible to invert a lone diff: the original `state` is
 * required to recover values that were changed or deleted.
 */
export function invertDiff<T>(state: T, diff: ObjectDiff<T>): ObjectDiff<T> {
  assertType<Record<string, unknown>>(state);

  const ret: ObjectDiff<T> = {};

  for (const rkey of objectKeys(diff)) {
    matchRunes(diff, rkey, {
      // nested array → recursively invert against the old array
      array(key, valueB) {
        const target = state[key];
        if (!Array.isArray(target)) {
          throw new TypeError("Expected array");
        }
        Object.assign(ret, arrayDiff(key, invertArrayDiff(target, valueB)));
      },
      // primitive / type change → change back to the old value
      change(key) {
        Object.assign(ret, changeDiff(key, state[key]));
      },
      // key created by the diff (didn't exist in A) → delete it to invert
      create(key) {
        Object.assign(ret, deletionDiff(key));
      },
      // key deleted by the diff (existed in A) → recreate it with old value
      delete(key) {
        Object.assign(ret, creationDiff(key, state[key]));
      },
      // nested object → recursively invert against the old object
      object(key, valueB) {
        const target = state[key];
        if (typeof target !== "object" || target === null) {
          throw new TypeError("Expected object");
        }
        Object.assign(ret, objectDiff(key, invertDiff(target, valueB)));
      },
    });
  }

  return ret;
}

/**
 * Invert an array diff with respect to an array.
 *
 * Given `state` (= A) and a diff describing A → B, produce the diff describing
 * B → A.
 */
export function invertArrayDiff<T>(
  state: T[],
  diff: ArrayDiff<T>,
): ArrayDiff<T> {
  const [delta, itemDiffs = []] = diff;

  // The inverse restores the original length change.
  const invDelta = -delta;

  // Offsets are relative to the end of the array. Item diffs only touch the
  // common prefix (indices 0..min(a,b)-1), which is present in both A and B at
  // the same index. An offset relative to A of `offsetA = a.length - i` becomes
  // `offsetB = b.length - i = offsetA + delta` relative to B.
  const invItemDiffs: ItemDiff<T>[] = [];

  for (const item of itemDiffs) {
    matchItemDiff(item, {
      // nested array item: recursively invert against the original sub-array.
      array(offset, valueB) {
        const index = state.length - offset;
        const target = state[index];
        if (!Array.isArray(target)) {
          throw new TypeError("Expected array");
        }
        invItemDiffs.push(
          arrayItemDiff<T>(offset + delta, invertArrayDiff(target, valueB)),
        );
      },
      // nested object item: recursively invert against the original sub-object.
      object(offset, valueB) {
        const index = state.length - offset;
        const target = state[index];
        if (typeof target !== "object" || target === null) {
          throw new TypeError("Expected object");
        }
        invItemDiffs.push(
          objectItemDiff(offset + delta, invertDiff(target, valueB)),
        );
      },
      // set: the diff replaced `state[i]` with a new value; to invert, set it
      // back to the original `state[i]`.
      set(offset) {
        const index = state.length - offset;
        invItemDiffs.push(changeItemDiff(offset + delta, state[index] as T));
      },
    });
  }

  // If the forward diff appended items (delta > 0), the inverse must delete
  // them (invDelta < 0). If the forward diff deleted items (delta < 0), the
  // inverse must re-append the original tail that was removed.
  if (invDelta <= 0) {
    // Pure deletion: matches the shape produced by `diffArrays` when there is
    // nothing to append. Only elide item diffs to keep the compact form.
    if (invItemDiffs.length === 0) {
      return [invDelta];
    }
    return [invDelta, invItemDiffs];
  }

  // Re-append the original trailing elements that the forward diff removed.
  const appends = state.slice(state.length + delta);
  return [invDelta, invItemDiffs, ...appends];
}
