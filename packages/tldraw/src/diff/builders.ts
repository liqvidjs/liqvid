import { deletePlaceholder, runes } from "./runes.ts";
import type {
  ArrayDiff,
  ArrayItemDiff,
  ChangeItemDiff,
  DeletePlaceholder,
  DiffRecord,
  Key,
} from "./types.ts";

export function updateArrayDiff<K extends string, D extends ArrayDiff>(
  key: K,
  diff: D,
) {
  return { [`${runes.array}${key}`]: diff } as Readonly<
    Record<Key<"array", K>, D>
  >;
}

export function creationDiff<K extends string, V>(key: string, value: V) {
  return { [`${runes.add}${key}`]: value } as Readonly<
    Record<Key<"add", K>, V>
  >;
}

export function deletionDiff<K extends string>(key: K) {
  return { [`${runes.delete}${key}`]: deletePlaceholder } as Readonly<
    Record<Key<"delete", K>, DeletePlaceholder>
  >;
}

export function updateObjectDiff<K extends string, D extends DiffRecord>(
  key: K,
  diff: D,
) {
  return { [`${runes.object}${key}`]: diff } as Record<Key<"object", K>, D>;
}

export function setDiff(
  key: string,
  obj: unknown,
): Record<Key<"set">, unknown> {
  return { [`${runes.set}${key}`]: obj };
}

// item diffs
export function changeItemDiff(index: number, diff: unknown): ChangeItemDiff {
  return [index, diff];
}

export function arrayItemDiff(index: number, diff: ArrayDiff): ArrayItemDiff {
  return [`${runes.array}${index}`, diff];
}

export function objectItemDiff<N extends number, D extends DiffRecord>(
  index: N,
  diff: D,
) {
  return [`${runes.object}${index}`, diff] as [Key<"object", `${N}`>, D];
}
