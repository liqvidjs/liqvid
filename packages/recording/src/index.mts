import { devProvider } from "@liqvid/ssr/react";

export { BaseRecorder } from "./base-recorder.ts";
export { RecordingManager } from "./RecordingManager.mts";
export {
  RecordingContext,
  useRecordingApi,
} from "./RecordingProvider";
export type { Recorder } from "./recorder.mts";
export {
  compress,
  ReplayDataRecorder,
} from "./recorders/replay-data-recorder.mts";
export type { RecordingPlugin } from "./types.mts";

export const RecordingProvider = devProvider(() =>
  import("./RecordingProvider").then((imports) => imports.RecordingProvider),
);
