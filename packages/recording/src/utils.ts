import { Duration, type DurationLike } from "@liqvid/duration";
import {
  assertType,
  type CleanUpFn,
  mapRecord,
  type ReplayData,
  truncate,
} from "@liqvid/utils";
import type { Seekable } from "@lqv/playback";

import type { RecordingData } from "./types";

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

    /** {@link MediaElement} to sync with. */
    playback: Seekable;

    /**
     * When replay should begin
     * @default 0
     */
    start?: DurationLike;
  }>;

export function makeReplayPlugin<Datum, State, Action, Props, History>({
  apply,
  blankState,
  commit,
  decompress,
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

  /** Decompress an action. */
  decompress: (data: Datum, history: History) => Action;

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
    recording: { initial, data },
    playback,
    start = Duration.zero,
    ...props
  }) => {
    assertType<Props>(props);

    /** Array of times that events happen */
    const times = data.reduce(
      (acc, [duration]) => acc.concat((acc.at(-1) ?? 0) + duration),
      [] as number[],
    );

    /** Uncompressed actions */
    const history = {} as History;
    const actions: Action[] = data.map(([_, event]) =>
      decompress(event, history),
    );

    let state = initial ?? blankState();
    state = initialize?.(state, props) ?? state;

    /** Array of inverse operations */
    const inverses: Action[] = [];
    for (const action of actions) {
      inverses.push(invert(state, action));
      apply(state, action, true);
    }

    /* main logic */
    let index = 0;
    let lastTime = 0;

    const startSeconds = Duration.inSeconds(start);

    const update = (): void => {
      const t = playback.currentTime;
      const progress = (t - startSeconds) * 1000;

      const actionsToApply: Action[] = [];

      // forward
      if (lastTime <= t && index < times.length) {
        let i = index;
        for (; i < data.length && times[i]! <= progress; ++i) {
          actionsToApply.push(actions[i]!);
        }
        index = i;
      } else if (t < lastTime && 0 < index) {
        // backward
        let i = index - 1;
        for (; 0 <= i && progress < times[i]!; --i) {
          actionsToApply.push(inverses[i]!);
        }
        index = i + 1;
      }

      if (actionsToApply.length > 0) {
        const action = merge(...actionsToApply);
        apply(state, action, true);
        commit(action, props);
      }

      lastTime = t;
    };

    // subscribe
    playback.addEventListener("timeupdate", update);

    // return unsubscription
    return () => {
      playback.removeEventListener("timeupdate", update);
    };
  };
}

export function getFinalState<Datum, State, Action, History>({
  apply,
  blankState,
  initial,
  decompress,
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
  /** Uncompressed actions */
  const history = {} as History;
  const actions: Action[] = data.map(([_, event]) =>
    decompress(event, history),
  );

  let state = initial ?? blankState();
  state = initialize?.(state) ?? state;

  if (actions.length > 0) {
    const action = merge(...actions);
    apply(state, action, true);
  }

  return state;
}
