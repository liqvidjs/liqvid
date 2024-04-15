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
export function matchItemDiff<R>(
  [offset, item]: ItemDiff,
  fns: {
    set?: (offset: number, value: unknown) => R;
    array?: (offset: number, value: ArrayDiff) => R;
    object?: (offset: number, value: ObjectDiff) => R;
  }
): R | undefined {
  if (typeof offset === "number") {
    return fns.set?.(offset, item);
  }

  const numeric = getOffset(offset);

  if (isRune(offset, runes.array)) {
    assertType<ArrayDiff>(item);
    return fns?.array?.(numeric, item);
  } else if (isRune(offset, runes.object)) {
    assertType<ObjectDiff>(item);
    return fns?.object?.(numeric, item);
  }
}

export function isRune<R extends Rune>(
  key: string,
  rune: R
): key is `${R}${string}` {
  return key.startsWith(rune as string);
}

/** Pattern-match on an object diff. */
export function matchRunes<R>(
  diff: ObjectDiff,
  key: keyof ObjectDiff,
  fns: {
    [name in RuneName]?: (key: string, rkey: ObjectDiff[RunedKey<name>]) => R;
  }
): R | undefined {
  for (const name of Object.keys(fns) as RuneName[]) {
    const rune = runes[name];
    if (key.startsWith(rune)) {
      const fn = fns[name];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return fn(key.slice(rune.length), diff[key] as any);
    }
  }
}

export function consume(
  a: ObjectDiff,
  key: string,
  fns: {
    [$name in RuneName | "else" | "none"]?: $name extends RuneName
      ? (value: ObjectDiff[RunedKey<$name>]) => unknown
      : $name extends "else"
      ? <K extends RuneName>(name: K, value: ObjectDiff[RunedKey<K>]) => unknown
      : () => unknown;
  } = {}
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

export function getOffset(offset: ItemDiff[0]): number {
  if (typeof offset === "number") return offset;

  if (isRune(offset, runes.array)) {
    return parseInt(offset.slice(runes.array.length), 10);
  } else if (isRune(offset, runes.object)) {
    return parseInt(offset.slice(runes.object.length), 10);
  }

  throw new Error(`Invalid index: ${offset}`);
}

export function addToOffset<T extends ItemDiff[0]>(
  offset: T,
  delta: number
): T {
  const result = getOffset(offset) + delta;
  if (typeof offset === "number") return result as T;

  if (isRune(offset, runes.array)) {
    return `${runes.array}${result}` as T;
  }

  return `${runes.object}${result}` as T;
}

/**
 * Invert a diff with respect to an object.
 * Note that it is not possible to invert a lone diff.
 */
export function invertDiff(state: object, diff: ObjectDiff): ObjectDiff {
  return diffObjects(applyDiff(state, diff), state);
}
