export { applyArrayDiff, applyDiff } from "./apply.ts";
export {
  arrayItemDiff,
  creationDiff,
  deletionDiff,
  objectItemDiff,
  updateArrayDiff,
  updateObjectDiff,
} from "./builders.ts";
export { arrDiff, objDiff } from "./compute.ts";
export { mergeArrayDiffs, mergeDiffs } from "./merge.ts";
export type { DiffRecord } from "./types.ts";
export { invertDiff, matchItemDiff, matchRunes } from "./utils.ts";
