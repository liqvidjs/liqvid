const isDevelopment = process.env.NODE_ENV === "development";

import { lazy } from "react";
import { Fragment } from "react/jsx-runtime";

export { BaseRecorder } from "./base-recorder.ts";
export { RecordingManager } from "./RecordingManager.ts";
export {
  RecordingContext,
  /** RecordingProvider without env-switching */
  RecordingProvider as RecordingProviderUnivalent,
  useRecordingApi,
} from "./RecordingProvider.tsx";
export type { Recorder } from "./recorder.ts";
export {
  compress,
  ReplayDataRecorder,
} from "./recorders/replay-data-recorder.mts";
export type { RecordingPlugin } from "./types.ts";

export const RecordingProvider = isDevelopment
  ? lazy(() =>
      import("./RecordingProvider.tsx").then((imports) => ({
        default: imports.RecordingProvider,
      })),
    )
  : Fragment;
