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
export { cmp, invertDiff, matchItemDiff, matchRunes } from "./utils.ts";
