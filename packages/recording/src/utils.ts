import { Duration, type DurationLike } from "@liqvid/duration";
import {
  assertType,
  type CleanUpFn,
  mapRecord,
  type ReplayData,
  truncate,
} from "@liqvid/utils";
import type { Seekable } from "@lqv/playback";

import type { RecordingData } from "./types.ts";

/**
 * Truncate numerical precision to reduce filesize.
 * @param o Data to compress.
 * @param precision Number of decimal points to include.
 */
export function compress<T>(o: T, precision = 2): T {
  switch (typeof o) {
    case "object":
      if (Array.isArray(o)) {
        return o.map((val) => compress(val, precision)) as T & unknown[];
      }
      if (o === null) {
        return o;
      }
      return mapRecord(o as Record<string, unknown>, (value) =>
        compress(value, precision),
      ) as T;
    case "number":
      return truncate(o, precision) as T & number;
    default:
      return o;
  }
}

export type ReplayPluginProps<Datum, State, Props> = Props &
  Readonly<{
    /** Data to replay */
    recording: RecordingData<ReplayData<Datum>, State>;

    /** Override the checkpoint depth when the plugin supports state restore. */
    cacheDepth?: ReplayCacheDepth<Datum, State>;

    /** {@link MediaElement} to sync with. */
    playback: Seekable;

    /**
     * When replay should begin
     * @default 0
     */
    start?: DurationLike;
  }>;

export type ReplayCacheDepth<Datum, State> =
  | number
  | ((recording: RecordingData<ReplayData<Datum>, State>) => number);

type ReplayCheckpoint<State> = {
  index: number;
  time: number;
  state: State;
};

const SEEK_THRESHOLD_MS = 100;

function resolveCacheDepth(
  requested: number,
  actionCount: number,
  canRestoreState: boolean,
): number {
  if (!canRestoreState || !Number.isFinite(requested)) return 0;
  const maxDepth = Math.ceil(Math.log2(actionCount + 1));
  return Math.min(maxDepth, Math.max(0, Math.floor(requested)));
}

export function makeReplayPlugin<Datum, State, Action, Props, History>({
  apply,
  blankState,
  commit,
  commitState,
  decompress,
  defaultCacheDepth = 0,
  initializeHistory,
  initialize,
  invert,
  merge,
}: {
  /** Apply an action to a state. */
  apply: (state: State, action: Action, inPlace?: boolean) => State;

  /**
   * Get a default state. This is not the _initial_ state:
   * that will be computed by applying duration-0 actions
   * at the beginning of the recording to this. */
  blankState: () => State;

  /** Commit an action. */
  commit: (action: Action, props: Props) => void;

  /** Commit a complete state after replaying from a checkpoint. */
  commitState?: (state: State, props: Props) => void;

  /** Decompress an action. */
  decompress: (data: Datum, history: History) => Action;

  /** Checkpoint depth to use unless overridden by replay options. */
  defaultCacheDepth?: ReplayCacheDepth<Datum, State>;

  /** Seed decoder history from records already present in the initial state. */
  initializeHistory?: (history: History, state: State) => void;

  /**
   * Do something with the initial state, e.g. loading it into the target.
   * May optionally return a (possibly transformed) state to use in place of
   * the given one; this is useful when the stored initial state needs to be
   * normalized before actions can be applied to it.
   */
  initialize?: (state: State, props: Props) => State | undefined;

  /** Invert an action with respect to a state. */
  invert: (state: State, action: Action) => Action;

  /** Merge two actions. */
  merge: (...actions: readonly Action[]) => Action;
}): (options: ReplayPluginProps<Datum, State, Props>) => CleanUpFn {
  return ({
    recording,
    playback,
    start = Duration.zero,
    cacheDepth = defaultCacheDepth,
    ...props
  }) => {
    assertType<Props>(props);

    const { data, initial } = recording;
    const initialState = initial ?? blankState();

    /** Array of times that events happen */
    const times = data.reduce(
      (acc, [duration]) => acc.concat((acc.at(-1) ?? 0) + duration),
      [] as number[],
    );

    /** Uncompressed actions */
    const history = {} as History;
    initializeHistory?.(history, initialState);
    const actions: Action[] = data.map(([_, event]) =>
      decompress(event, history),
    );

    const requestedDepth =
      typeof cacheDepth === "function" ? cacheDepth(recording) : cacheDepth;
    const resolvedDepth = resolveCacheDepth(
      requestedDepth,
      actions.length,
      commitState !== undefined,
    );

    const state = initialize?.(initialState, props) ?? initialState;

    const replayHistory = createReplayHistory<State, Action>({
      actions,
      apply,
      depth: resolvedDepth,
      initialState: state,
      invert,
      merge,
      times,
    });
    const update = makeReplayUpdate({
      actions,
      apply,
      ...replayHistory,
      commit,
      commitState,
      merge,
      playback,
      props,
      start: Duration.inSeconds(start),
      times,
    });

    // subscribe
    playback.addEventListener("timeupdate", update);
    update();

    // return unsubscription
    return () => {
      playback.removeEventListener("timeupdate", update);
    };
  };
}

function makeReplayUpdate<State, Action, Props>({
  actions,
  apply,
  checkpoints,
  commit,
  commitState,
  inverses,
  merge,
  playback,
  props,
  start,
  state: initialState,
  times,
}: {
  actions: readonly Action[];
  apply: (state: State, action: Action, inPlace?: boolean) => State;
  checkpoints: readonly ReplayCheckpoint<State>[];
  commit: (action: Action, props: Props) => void;
  commitState?: (state: State, props: Props) => void;
  inverses: readonly Action[];
  merge: (...actions: readonly Action[]) => Action;
  playback: Seekable;
  props: Props;
  start: number;
  state: State;
  times: readonly number[];
}): () => void {
  let state = initialState;
  let index = 0;
  let lastTime = 0;

  return () => {
    const t = playback.currentTime;
    const progress = (t - start) * 1000;
    const isSeek =
      checkpoints.length > 1 &&
      ((t - lastTime) * 1000 < 0 || (t - lastTime) * 1000 >= SEEK_THRESHOLD_MS);
    const actionsToApply: Action[] = [];
    let direction: "backward" | "forward" | undefined;

    if (isSeek) {
      const checkpoint = findNearestCheckpoint(checkpoints, progress);
      state = apply(checkpoint.state, merge());
      index = checkpoint.index;
      direction = progress >= checkpoint.time ? "forward" : "backward";
    } else if (lastTime <= t && index < times.length) {
      direction = "forward";
    } else if (t < lastTime && index > 0) {
      direction = "backward";
    }

    if (direction) {
      const result = collectReplayActions({
        actions,
        direction,
        index,
        inverses,
        progress,
        times,
      });
      actionsToApply.push(...result.actions);
      index = result.index;
    }

    if (actionsToApply.length > 0) {
      const action = merge(...actionsToApply);
      apply(state, action, true);
      if (!isSeek) commit(action, props);
    }

    if (isSeek) commitState?.(state, props);
    lastTime = t;
  };
}

function createReplayHistory<State, Action>({
  actions,
  apply,
  depth,
  initialState,
  invert,
  merge,
  times,
}: {
  actions: readonly Action[];
  apply: (state: State, action: Action, inPlace?: boolean) => State;
  depth: number;
  initialState: State;
  invert: (state: State, action: Action) => Action;
  merge: (...actions: readonly Action[]) => Action;
  times: readonly number[];
}): {
  checkpoints: ReplayCheckpoint<State>[];
  inverses: Action[];
  state: State;
} {
  const checkpoints: ReplayCheckpoint<State>[] = [
    { index: 0, state: initialState, time: 0 },
  ];
  const checkpointCounts = new Map<number, number>();
  const count = 2 ** depth;
  for (let i = 1; i < count; ++i) {
    const index = Math.floor((i * actions.length) / count);
    checkpointCounts.set(index, (checkpointCounts.get(index) ?? 0) + 1);
  }

  const cacheAt = (index: number, source: State): void => {
    const copies = checkpointCounts.get(index) ?? 0;
    const time = index === 0 ? 0 : times[index - 1]!;
    for (let i = 0; i < copies; ++i) {
      checkpoints.push({ index, state: apply(source, merge()), time });
    }
  };

  cacheAt(0, initialState);
  const inverses: Action[] = [];
  let simulation = depth > 0 ? apply(initialState, merge()) : initialState;
  for (let i = 0; i < actions.length; ++i) {
    const action = actions[i]!;
    inverses.push(invert(simulation, action));
    simulation = apply(simulation, action, true);
    cacheAt(i + 1, simulation);
  }

  return {
    checkpoints,
    inverses,
    state: depth > 0 ? apply(initialState, merge()) : simulation,
  };
}

function collectReplayActions<Action>({
  actions,
  direction,
  index,
  inverses,
  progress,
  times,
}: {
  actions: readonly Action[];
  direction: "backward" | "forward";
  index: number;
  inverses: readonly Action[];
  progress: number;
  times: readonly number[];
}): { actions: Action[]; index: number } {
  const result: Action[] = [];

  if (direction === "forward") {
    for (; index < actions.length && times[index]! <= progress; ++index) {
      result.push(actions[index]!);
    }
  } else {
    let i = index - 1;
    for (; i >= 0 && progress < times[i]!; --i) {
      result.push(inverses[i]!);
    }
    index = i + 1;
  }

  return { actions: result, index };
}

function findNearestCheckpoint<State>(
  checkpoints: readonly ReplayCheckpoint<State>[],
  time: number,
): ReplayCheckpoint<State> {
  let low = 0;
  let high = checkpoints.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (checkpoints[middle]!.time < time) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const before = checkpoints[Math.max(0, low - 1)]!;
  const after = checkpoints[Math.min(low, checkpoints.length - 1)]!;
  return time - before.time <= after.time - time ? before : after;
}

export function getFinalState<Datum, State, Action, History>({
  apply,
  blankState,
  initial,
  decompress,
  initializeHistory,
  initialize,
  data,
  merge,
}: {
  /** Apply an action to a state. */
  apply: (state: State, action: Action, inPlace?: boolean) => State;

  /**
   * Get a default state. This is not the _initial_ state:
   * that will be computed by applying duration-0 actions
   * at the beginning of the recording to this. */
  blankState: () => State;

  /** Decompress an action. */
  decompress: (data: Datum, history: History) => Action;

  /** Seed decoder history from records already present in the initial state. */
  initializeHistory?: (history: History, state: State) => void;

  /**
   * Do something with the initial state, e.g. loading it into the target.
   * May optionally return a (possibly transformed) state to use in place of
   * the given one; this is useful when the stored initial state needs to be
   * normalized before actions can be applied to it.
   */
  initialize?: (state: State) => State | undefined;

  /** Merge two actions. */
  merge: (...actions: Action[]) => Action;

  initial?: State;

  data: ReplayData<Datum>;
}) {
  const initialState = initial ?? blankState();

  /** Uncompressed actions */
  const history = {} as History;
  initializeHistory?.(history, initialState);
  const actions: Action[] = data.map(([_, event]) =>
    decompress(event, history),
  );

  let state = initialState;
  state = initialize?.(state) ?? state;

  if (actions.length > 0) {
    const action = merge(...actions);
    apply(state, action, true);
  }

  return state;
}
