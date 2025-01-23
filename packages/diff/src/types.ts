import type {deletePlaceholder, runes} from "./runes";

// runes
export type RuneName = keyof typeof runes;
export type Rune = (typeof runes)[RuneName];
export type RunedKey<
  K extends RuneName,
  Name extends string = string,
> = `${(typeof runes)[K]}${Name}`;

// array diffs
export type ChangeItemDiff<T> = [offset: number, value: T];
export type ObjectItemDiff<T> = [
  offset: RunedKey<"object">,
  diff: ObjectDiff<T>,
];
export type ArrayItemDiff<T> = [offset: RunedKey<"array">, diff: ArrayDiff<T>];

/**
 * Note that offsets are relative to the **end** of the array.
 */
export type ItemDiff<T> =
  | ArrayItemDiff<T>
  | ChangeItemDiff<T>
  | ObjectItemDiff<T>;

/**
 * A record describing how to make changes to an array.
 */
export type ArrayDiff<T> = [
  delta: number,
  itemDiffs?: ItemDiff<T>[],
  ...tail: unknown[],
];

// delete placeholder
export type DeletePlaceholder = typeof deletePlaceholder;

/**
 * A record describing how to make changes to an object.
 */
export type ObjectDiff<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: RunedKey<"array">]: ArrayDiff<any>;
  [key: RunedKey<"change">]: unknown;
  [key: RunedKey<"create">]: unknown;
  [key: RunedKey<"delete">]: DeletePlaceholder;
  [key: RunedKey<"object">]: ObjectDiff<T>;
};
