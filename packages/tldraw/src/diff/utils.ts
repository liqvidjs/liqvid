import { assertType } from "@liqvid/utils";

import { applyDiff, objDiff } from "./index.ts";
import { runes } from "./runes.ts";
import type {
  ArrayDiff,
  DiffRecord,
  ItemDiff,
  Key,
  Rune,
  RuneName,
} from "./types.ts";

export function objectKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

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

  assertObject(a);
  assertObject(b);

  const keysA = Object.keys(a);
  const keysB = new Set(Object.keys(b));

  if (keysA.length !== keysB.size) return false;
  return keysA.every((key) => keysB.has(key) && cmp(a[key], b[key]));
}

function assertObject(a: unknown): asserts a is Record<string, unknown> {
  if (typeof a !== "object" || a === null) {
    throw new TypeError(`Expected object, got ${typeof a}`);
  }
}

export function matchItemDiff<R>(
  [offset, item]: ItemDiff,
  fns: {
    set?: (offset: number, value: unknown) => R;
    array?: (offset: number, value: ArrayDiff) => R;
    object?: (offset: number, value: DiffRecord) => R;
  },
): R | undefined {
  if (typeof offset === "number") {
    return fns.set?.(offset, item);
  }

  const numeric = getOffset(offset);

  if (isRune(offset, runes.array)) {
    assertType<ArrayDiff>(item);
    return fns?.array?.(numeric, item);
  } else if (isRune(offset, runes.object)) {
    assertType<DiffRecord>(item);
    return fns?.object?.(numeric, item);
  }
}

export function isRune<R extends Rune>(
  key: string,
  rune: R,
): key is `${R}${string}` {
  return key.startsWith(rune as string);
}

export function matchRunes<R>(
  diff: DiffRecord,
  key: keyof DiffRecord,
  fns: {
    [name in RuneName]?: (key: string, rkey: DiffRecord[Key<name>]) => R;
  },
): R | undefined {
  // console.dir({diff, key});
  for (const name of Object.keys(fns) as RuneName[]) {
    const rune = runes[name];
    if (key.startsWith(rune)) {
      return fns[name]!(key.slice(rune.length), diff[key] as any);
    }
  }
}

export function consume(
  a: DiffRecord,
  key: string,
  fns: {
    [$name in RuneName | "else" | "none"]?: $name extends RuneName
      ? (value: DiffRecord[Key<$name>]) => unknown
      : $name extends "else"
        ? <K extends RuneName>(name: K, value: DiffRecord[Key<K>]) => unknown
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
  delta: number,
): T {
  const result = getOffset(offset) + delta;
  if (typeof offset === "number") return result as T;

  if (isRune(offset, runes.array)) {
    return `${runes.array}${result}` as T;
  }

  return `${runes.object}${result}` as T;
}

export function assertDefined<T>(a: T): asserts a is Exclude<T, undefined> {}

export function invertDiff(state: object, diff: DiffRecord): DiffRecord {
  return objDiff(applyDiff(state, diff), state);
}
