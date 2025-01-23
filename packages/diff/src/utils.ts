import {assertType} from "@liqvid/utils/types";
import {applyDiff} from "./apply";
import {diffObjects} from "./compute";
import {runes} from "./runes";
import type {
  ArrayDiff,
  ItemDiff,
  ObjectDiff,
  Rune,
  RuneName,
  RunedKey,
} from "./types";

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * Note that it is not possible to invert a lone diff.
 */
export function invertDiff<T>(state: T, diff: ObjectDiff<T>): ObjectDiff<T> {
  return diffObjects(applyDiff(state, diff), state);
}
