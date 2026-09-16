import type { DurationLike } from "@liqvid/duration";
import type { RecordingData } from "@liqvid/recording";
import { concatenateReplayData, type ReplayData } from "@liqvid/utils";

import type { ReplayState, TldrawEvent } from "./types.ts";
import { PACKAGE, VERSION } from "./version.ts";

type TldrawRecordingData = RecordingData<ReplayData<TldrawEvent>, ReplayState>;

export function joinTldrawRecordings(
  ...configs: ReadonlyArray<
    readonly [TldrawRecordingData, { start?: DurationLike }?]
  >
): TldrawRecordingData {
  const head = configs[0];

  if (!head) {
    throw new Error("no recordings provided");
  }

  const parts = configs.map(
    ([recording, { start } = { start: 0 }]) =>
      [recording.data, start ?? 0] as const,
  );

  return {
    data: concatenateReplayData(parts[0]!, ...parts.slice(1)),
    initial: head[0].initial,
    package: PACKAGE,
    version: VERSION,
  };
}
