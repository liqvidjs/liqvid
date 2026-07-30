import type { deletePlaceholder, runes } from "./runes.ts";

export type RuneName = keyof typeof runes;
export type Rune = (typeof runes)[RuneName];
export type Key<
  K extends RuneName,
  Name extends string = string,
> = `${(typeof runes)[K]}${Name}`;

export type ChangeItemDiff = readonly [offset: number, value: unknown];
export type ObjectItemDiff = readonly [offset: Key<"object">, diff: DiffRecord];
export type ArrayItemDiff = readonly [offset: Key<"array">, diff: ArrayDiff];

export type ItemDiff = ChangeItemDiff | ArrayItemDiff | ObjectItemDiff;

export type ArrayDiff = readonly [
  delta: number,
  itemDiffs?: ItemDiff[],
  ...tail: unknown[],
];

export type DeletePlaceholder = typeof deletePlaceholder;

export type DiffRecord = {
  [key: Key<"add">]: unknown;
  [key: Key<"array">]: ArrayDiff;
  [key: Key<"delete">]: DeletePlaceholder;
  [key: Key<"object">]: DiffRecord;
  [key: Key<"set">]: unknown;
};

export type Assoc = Record<string, unknown>;
