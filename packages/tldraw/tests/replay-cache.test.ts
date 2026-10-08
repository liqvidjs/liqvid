import { diffObjects } from "@liqvid/diff";
import type { RecordingData } from "@liqvid/recording";
import { getFinalState, makeReplayPlugin } from "@liqvid/recording/utils";
import type { ReplayData } from "@liqvid/utils";
import type { Seekable } from "@lqv/playback";

import {
  apply,
  blankState,
  decompress,
  initializeHistory,
  merge as mergeTldrawActions,
} from "../src/replay.ts";
import type { ReplayState, TldrawEvent } from "../src/types.ts";

type CacheState = { value: number };
type CacheRecording = RecordingData<ReplayData<number>, CacheState>;
type CacheDepth = number | ((recording: CacheRecording) => number);

function makeRecording(): CacheRecording {
  return {
    data: Array.from({ length: 10 }, (): [number, number] => [100, 1]),
    initial: { value: 0 },
    package: "test",
    version: "1",
  };
}

function makePlayback() {
  const target = new EventTarget();
  let currentTime = 0;
  Object.defineProperty(target, "currentTime", { get: () => currentTime });

  return {
    playback: target as unknown as Seekable,
    seek(time: number) {
      currentTime = time;
      target.dispatchEvent(new Event("timeupdate"));
    },
  };
}

function makeReplay(defaultCacheDepth: CacheDepth) {
  const mergeBatchSizes: number[] = [];

  const replay = makeReplayPlugin<
    number,
    CacheState,
    number,
    { commits: number[]; restores: number[] },
    object
  >({
    apply(state, action, inPlace = false) {
      const next = inPlace ? state : { ...state };
      next.value += action;
      return next;
    },
    blankState: () => ({ value: 0 }),
    commit(action, { commits }) {
      commits.push(action);
    },
    commitState(state, { restores }) {
      restores.push(state.value);
    },
    decompress: (action) => action,
    defaultCacheDepth,
    invert: (_state, action) => -action,
    merge(...actions) {
      if (actions.length > 0) mergeBatchSizes.push(actions.length);
      return actions.reduce((sum, action) => sum + action, 0);
    },
  });

  return { mergeBatchSizes, replay };
}

describe("makeReplayPlugin cache depth", () => {
  test("seeks from the closest midpoint checkpoint and rewinds from it", () => {
    const recording = makeRecording();
    const { mergeBatchSizes, replay } = makeReplay((data) =>
      data.data.length === 10 ? 1 : 0,
    );
    const { playback, seek } = makePlayback();
    const commits: number[] = [];
    const restores: number[] = [];

    const cleanup = replay({ commits, playback, recording, restores });
    seek(0.8);
    seek(0.85);
    seek(0.9);
    seek(0.4);
    cleanup();

    expect(mergeBatchSizes).toEqual([3, 1, 1]);
    expect(commits).toEqual([1]);
    expect(restores).toEqual([8, 4]);
  });

  test("accepts a function-valued per-recording cache depth override", () => {
    const recording = makeRecording();
    const { mergeBatchSizes, replay } = makeReplay(0);
    const { playback, seek } = makePlayback();
    const restores: number[] = [];
    const cleanup = replay({
      cacheDepth: (data) => (data.data.length === 10 ? 1 : 0),
      commits: [],
      playback,
      recording,
      restores,
    });

    seek(0.8);
    cleanup();

    expect(mergeBatchSizes).toEqual([3]);
    expect(restores).toEqual([8]);
  });

  test("keeps the un-cached replay path when cache depth is zero", () => {
    const recording = makeRecording();
    const { mergeBatchSizes, replay } = makeReplay(0);
    const { playback, seek } = makePlayback();
    const restores: number[] = [];
    const cleanup = replay({ commits: [], playback, recording, restores });

    seek(0.8);
    cleanup();

    expect(mergeBatchSizes).toEqual([8]);
    expect(restores).toEqual([]);
  });
});

describe("tldraw action merging", () => {
  test("does not mutate action diffs needed for later rewinds", () => {
    const create = {
      diff: {
        "+shape:stroke": {
          id: "shape:stroke",
          props: { color: "red", segments: [{ path: [{ x: 0, y: 0 }] }] },
        },
      },
    };
    const update = {
      diff: { "@shape:stroke": { "@props": { "=color": "blue" } } },
    };
    const createBefore = structuredClone(create);
    const updateBefore = structuredClone(update);

    const firstMerge = mergeTldrawActions(create, update);
    const secondMerge = mergeTldrawActions(create, update);

    expect(create).toEqual(createBefore);
    expect(update).toEqual(updateBefore);
    expect(secondMerge).toEqual(firstMerge);
  });

  test("updates shapes that exist only in the initial snapshot", () => {
    const id = "shape:initial" as const;
    const before = {
      id,
      props: { color: "red" },
      type: "geo",
      typeName: "shape",
    };
    const after = { ...before, props: { color: "blue" } };
    const initial = {
      containerWidth: 1280,
      pointer: [0, 0],
      snapshot: { schema: {}, store: { [id]: before } },
      viewport: { camera: [0, 0, 1], page: "page:page" },
    } as unknown as ReplayState;
    const event = { [id]: diffObjects(before, after) } as TldrawEvent;

    const state = getFinalState({
      apply,
      blankState,
      data: [[100, event]],
      decompress,
      initial,
      initializeHistory,
      merge: mergeTldrawActions,
    });

    expect(state.snapshot.store[id]).toHaveProperty("id", id);
    expect(state.snapshot.store[id]).toHaveProperty("props.color", "blue");
  });
});
