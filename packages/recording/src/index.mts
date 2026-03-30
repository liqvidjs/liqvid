const isDevelopment = process.env.NODE_ENV === "development";

import { lazy } from "react";
import { Fragment } from "react/jsx-runtime";

export { BaseRecorder } from "./base-recorder.ts";
export { RecordingManager } from "./RecordingManager.mts";
export {
  RecordingContext,
  /** RecordingProvider without env-switching */
  RecordingProvider as RecordingProviderUnivalent,
  useRecordingApi,
} from "./RecordingProvider";
export type { Recorder } from "./recorder.mts";
export {
  compress,
  ReplayDataRecorder,
} from "./recorders/replay-data-recorder.mts";
export type { RecordingPlugin } from "./types.mts";

export const RecordingProvider = isDevelopment
  ? lazy(() =>
      import("./RecordingProvider").then((imports) => ({
        default: imports.RecordingProvider,
      })),
    )
  : Fragment;
