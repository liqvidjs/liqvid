"use client";

import { createContext, use, useMemo } from "react";

import {
  type ChosenRecordingsData,
  createRecordingTree,
} from "#_/utils/chosen-recordings";

/**
 * Value provided by {@link RecordingsProvider}. This is intentionally plain,
 * serializable data — {@link import("./assets.mts").Recording} objects are
 * class instances and cannot cross the client-server boundary, so recording-
 * shaped data with plain duration options is passed down and the objects are
 * rebuilt on the client.
 */
export type RecordingsContextValue = {
  /**
   * URL of the project's `.liqvid` assets directory, e.g.
   * `/api/liqvid/static/my-project/.liqvid` in development.
   */
  base: string;

  /**
   * Recording-shaped serializable data, nested by parameter values for
   * parameterized projects. A leaf has the shape `{ duration: { ... } }`.
   * Only the current parameter combination is populated.
   */
  recordings: ChosenRecordingsData;

  /** Number of parameter-value levels before recording leaves. */
  parameterDepth: number;
};

/** @package */
export const recordingsContext = createContext<RecordingsContextValue | null>(
  null,
);
recordingsContext.displayName = "ChosenRecordings";

/**
 * The recordings chosen for inclusion in the final video, as {@link Recording}
 * objects rooted at each recording's directory. Pass the generated
 * `ChosenRecordings` type from the project's `.liqvid/types.ts`:
 *
 * ```tsx
 * const recordings = useRecordings<ChosenRecordings>();
 * ```
 *
 * For parameterized projects, only the current parameter combination is
 * populated at runtime, although the type is typed as if every combination
 * were assigned.
 */
export function useRecordings<R = Record<string, never>>(): R {
  const value = use(recordingsContext);
  if (value === null) {
    throw new Error("useRecordings must be used within a RecordingsProvider");
  }

  return useMemo(
    () =>
      createRecordingTree(value.base, value.recordings, value.parameterDepth),
    [value],
  ) as R;
}
