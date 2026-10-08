import { diffObjects } from "@liqvid/diff";
import type { RecordingData } from "@liqvid/recording";
import { getFinalState } from "@liqvid/recording/utils";
import type { ReplayData } from "@liqvid/utils";

import { getDefaultShape } from "../src/defaults.ts";
import { joinTldrawRecordings } from "../src/join.ts";
import { apply, blankState, decompress, merge } from "../src/replay.ts";
import type { DecodedTLShape, ReplayState, TldrawEvent } from "../src/types.ts";
import { encodeDiffPaths, encodeShape } from "../src/utils.ts";

function makeRecording(
  store: Record<string, unknown>,
  data: ReplayData<TldrawEvent> = [],
) {
  const initial = {
    containerWidth: 1280,
    pointer: [0, 0],
    snapshot: { schema: {}, store },
    viewport: { camera: [0, 0, 1], page: "page:page" },
  } as unknown as ReplayState;

  return {
    data,
    initial,
    package: "@lqv/tldraw",
    version: "1.0.0",
  } satisfies RecordingData<ReplayData<TldrawEvent>, ReplayState>;
}

describe("joinTldrawRecordings", () => {
  test("does not prepend a reset before the first recording's events", () => {
    const shape = { ...getDefaultShape(), id: "shape:first" };
    const event = {
      [shape.id]: encodeDiffPaths(diffObjects(getDefaultShape(), shape)),
    } as TldrawEvent;
    const joined = joinTldrawRecordings([makeRecording({}, [[0, event]])]);

    expect(joined.data[0]?.[1]).toEqual(event);
  });

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

  test("updates an existing stroke without appending its segments again", () => {
    const shapeId = "shape:existing";
    const makeShape = (x: number) => ({
      id: shapeId,
      index: "a1",
      isLocked: false,
      meta: {},
      opacity: 1,
      parentId: "page:page",
      props: {
        color: "green",
        dash: "draw",
        fill: "none",
        isClosed: false,
        isComplete: true,
        isPen: true,
        segments: [
          {
            path: [
              { x: 0, y: 0, z: 0.5 },
              { x, y: 0, z: 0.5 },
            ],
            type: "free",
          },
        ],
        size: "s",
      },
      rotation: 0,
      type: "draw",
      typeName: "shape",
      x: 0,
      y: 0,
    });
    const shapeA = makeShape(5);
    const shapeB = makeShape(10);
    const createEvent = {
      [shapeId]: encodeDiffPaths(diffObjects(getDefaultShape(), shapeA)),
    } as TldrawEvent;
    const head = makeRecording({}, [[0, createEvent]]);
    const next = makeRecording({
      [shapeId]: encodeShape(shapeB as unknown as DecodedTLShape),
    });
    const joined = joinTldrawRecordings([head], [next, { start: 1 }]);

    const finalState = getFinalState({
      apply,
      blankState,
      data: joined.data,
      decompress,
      initial: joined.initial,
      merge,
    });
    const finalShape = finalState.snapshot.store[shapeId] as {
      props: { segments: { path: unknown[] }[] };
    };

    expect(finalShape.props.segments).toHaveLength(1);
    expect(finalShape.props.segments[0]?.path).toHaveLength(2);
  });
});
