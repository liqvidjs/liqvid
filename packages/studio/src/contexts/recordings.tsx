"use client";

import { recordingsContext } from "./recordings.client.ts";

/**
 * Provides serializable chosen-recording data to descendants. Rendered by
 * `liqvidProject`; you should not need to use this directly.
 */
export {
  type RecordingsContextValue,
  useRecordings,
  useRecordingsOptional,
} from "./recordings.client.ts";

export const RecordingsProvider = recordingsContext.Provider;
