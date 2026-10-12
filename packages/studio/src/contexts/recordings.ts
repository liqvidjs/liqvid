"use client";

import dynamic from "next/dynamic";

/**
 * Provides serializable chosen-recording data to descendants. Rendered by
 * `liqvidProject`; you should not need to use this directly.
 */
export {
  type RecordingsContextValue,
  useRecordings,
  useRecordingsOptional,
} from "./recordings.client.ts";

export const RecordingsProvider = dynamic(() =>
  import("./recordings.client.ts").then((mod) => ({
    default: mod.recordingsContext.Provider,
  })),
);
