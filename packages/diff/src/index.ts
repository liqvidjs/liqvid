export { applyArrayDiff, applyDiff } from "./apply.ts";
export {
  arrayDiff,
  arrayItemDiff,
  changeDiff,
  changeItemDiff,
  creationDiff,
  deletionDiff,
  objectDiff,
  objectItemDiff,
} from "./builders.ts";
export { diffArrays, diffObjects } from "./compute.ts";
export { mergeArrayDiffs, mergeDiffs } from "./merge.ts";
export { deletePlaceholder, runes } from "./runes.ts";
export type {
  ArrayDiff,
  ArrayItemDiff,
  ChangeItemDiff,
  DeletePlaceholder,
  ItemDiff,
  ObjectDiff,
  ObjectItemDiff,
  Rune,
  RunedKey,
  RuneName,
} from "./types.ts";
export {
  addToOffset,
  cmp,
  consume,
  getOffset,
  invertDiff,
  isRune,
  matchItemDiff,
  matchRunes,
  objectKeys,
} from "./utils.ts";
