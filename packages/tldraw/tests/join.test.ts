import type { RecordingData } from "@liqvid/recording";
import { getFinalState } from "@liqvid/recording/utils";
import type { ReplayData } from "@liqvid/utils";

import { joinTldrawRecordings } from "../src/join.ts";
import { apply, blankState, decompress, merge } from "../src/replay.ts";
import type { ReplayState, TldrawEvent } from "../src/types.ts";

function makeRecording(store: Record<string, unknown>) {
  const initial = {
    containerWidth: 1280,
    pointer: [0, 0],
    snapshot: { schema: {}, store },
    viewport: { camera: [0, 0, 1], page: "page:page" },
  } as unknown as ReplayState;

  return {
    data: [] as ReplayData<TldrawEvent>,
    initial,
    package: "@lqv/tldraw",
    version: "1.0.0",
  } satisfies RecordingData<ReplayData<TldrawEvent>, ReplayState>;
}

describe("joinTldrawRecordings", () => {
  test("replays shapes added in the next recording's initial state", () => {
    const shape = {
      id: "shape:new",
      type: "geo",
      typeName: "shape",
    };
    const joined = joinTldrawRecordings(
      [makeRecording({})],
      [makeRecording({ "shape:new": shape })],
    );

    const finalState = getFinalState({
      apply,
      blankState,
      data: joined.data,
      decompress,
      initial: joined.initial,
      merge,
    });

    expect(finalState.snapshot.store).toHaveProperty("shape:new", shape);
  });
});
