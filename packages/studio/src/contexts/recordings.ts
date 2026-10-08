"use client";

import { lazy } from "react";

/**
 * Provides serializable chosen-recording data to descendants. Rendered by
 * `liqvidProject`; you should not need to use this directly.
 */
export {
  type RecordingsContextValue,
  useRecordings,
} from "./recordings.client.ts";

export const RecordingsProvider = lazy(() =>
  import("./recordings.client.ts").then((mod) => ({
    default: mod.recordingsContext.Provider,
  })),
);
