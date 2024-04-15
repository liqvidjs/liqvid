import type {deletePlaceholder, runes} from "./runes";

// runes
export type RuneName = keyof typeof runes;
export type Rune = typeof runes[RuneName];
export type RunedKey<
  K extends RuneName,
  Name extends string = string
> = `${typeof runes[K]}${Name}`;

// array diffs
export type ChangeItemDiff = [offset: number, value: unknown];
export type ObjectItemDiff = [offset: RunedKey<"object">, diff: ObjectDiff];
export type ArrayItemDiff = [offset: RunedKey<"array">, diff: ArrayDiff];

/**
 * Note that offsets are relative to the **end** of the array.
 */
export type ItemDiff = ArrayItemDiff | ChangeItemDiff | ObjectItemDiff;

/**
 * A record describing how to make changes to an array.
 */
export type ArrayDiff = [
  delta: number,
  itemDiffs?: ItemDiff[],
  ...tail: unknown[]
];

// delete placeholder
export type DeletePlaceholder = typeof deletePlaceholder;

/**
 * A record describing how to make changes to an object.
 */
export type ObjectDiff = {
  [key: RunedKey<"array">]: ArrayDiff;
  [key: RunedKey<"change">]: unknown;
  [key: RunedKey<"create">]: unknown;
  [key: RunedKey<"delete">]: DeletePlaceholder;
  [key: RunedKey<"object">]: ObjectDiff;
};
