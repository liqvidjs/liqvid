import {deletePlaceholder, runes} from "./runes";
import type {
  ArrayDiff,
  ArrayItemDiff,
  ChangeItemDiff,
  DeletePlaceholder,
  ObjectDiff,
  RunedKey,
} from "./types";

/**
 * Make a diff to create a value.
 * @param key Key to use.
 * @param value Value to create.
 */
export function creationDiff<K extends string, V>(key: string, value: V) {
  return {[`${runes.create}${key}`]: value} as Record<RunedKey<"create", K>, V>;
}

/**
 * Make a diff to delete a value.
 * @param key Key to use.
 * @returns Diff to delete the value.
 */
export function deletionDiff<K extends string>(key: K) {
  return {[`${runes.delete}${key}`]: deletePlaceholder} as Record<
    RunedKey<"delete", K>,
    DeletePlaceholder
  >;
}

/**
 * Make a diff to update an array.
 * @param key Key to use.
 * @param diff Array diff to apply.
 */
export function arrayDiff<K extends string, T, D extends ArrayDiff<T>>(
  key: K,
  diff: D,
) {
  return {[`${runes.array}${key}`]: diff} as Record<RunedKey<"array", K>, D>;
}

/**
 * Make a diff to update an object.
 * @param key Key to use.
 * @param diff Object diff to apply.
 */
export function objectDiff<K extends string, T, D extends ObjectDiff<T>>(
  key: K,
  diff: D,
) {
  return {[`${runes.object}${key}`]: diff} as Record<RunedKey<"object", K>, D>;
}

/**
 * Make a diff to set a value.
 * @param key Key to use.
 * @value Value to set.
 */
export function changeDiff<K extends string, V>(key: string, value: V) {
  return {[`${runes.change}${key}`]: value} as Record<RunedKey<"change", K>, V>;
}

// item diffs

/**
 * Make an item diff to change a value.
 * @param offset Offset from the end to change.
 * @param value Value to change to.
 */
export function changeItemDiff<T>(offset: number, value: T): ChangeItemDiff<T> {
  return [offset, value];
}

/**
 * Make an item diff to change an array item.
 * @param offset Offset from the end to change.
 * @param diff Array diff to apply.
 */
export function arrayItemDiff<T>(
  offset: number,
  diff: ArrayDiff<T>,
): ArrayItemDiff<T> {
  return [`${runes.array}${offset}`, diff];
}

/**
 * Make an item diff to change an object item.
 * @param index Index to change.
 * @param diff Object diff to apply.
 */
export function objectItemDiff<T, D extends ObjectDiff<T>>(
  offset: number,
  diff: D,
) {
  return [`${runes.object}${offset}`, diff] as [RunedKey<"object">, D];
}
