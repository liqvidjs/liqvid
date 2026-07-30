import { Duration, type DurationLike } from "@liqvid/duration";
import type { RecordingData } from "@liqvid/recording";
import { assertType } from "@liqvid/utils";
import type { Seekable } from "@lqv/playback";

export function dbg(x: unknown) {
  console.log(x);
  return x;
}
export type Unsubscribe = () => void;

export type ReplayPluginProps<Datum, State, Props> = Props & {
  /** Data to replay */
  recording: RecordingData<Datum[], State>;

  /** {@link MediaElement} to sync with. */
  playback: Seekable;

  /**
   * When replay should begin
   * @default 0
   */
  start?: DurationLike;
};

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
  apply: (state: State, action: Action) => State;

  /**
   * Get a default state. This is not the _initial_ state:
   * that will be computed by applying duration-0 actions
   * at the beginning of the recording to this. */
  blankState: () => State;

  /** Commit an action. */
  commit: (action: Action, props: Props) => void;

  /** Decompress an action. */
  decompress: (data: Datum, history: History) => Action;

  /** Do something with the initial state. */
  initialize?: (state: State, props: Props) => void;

  /** Invert an action with respect to a state. */
  invert: (state: State, action: Action) => Action;

  /** Merge two actions. */
  merge: (...actions: Action[]) => Action;
}): (options: ReplayPluginProps<Datum, State, Props>) => Unsubscribe {
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
    const actions: Action[] = data.map(([_, event]) => {
      const duck = decompress(event, history);
      return duck;
    });

    let state = initial ?? blankState();
    initialize?.(state, props);

    /** Array of inverse operations */
    const inverses: Action[] = [];
    for (const action of actions) {
      inverses.push(invert(state, action));
      state = apply(state, action);
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
        console.debug("inverting", actionsToApply);
      }

      if (actionsToApply.length > 0) {
        const action = merge(...actionsToApply);
        // console.debug("applying", action);
        state = apply(state, action);
        commit(action, props);
      }

      lastTime = t;
    };

    return subscribe(playback, update);
  };
}

/**
 * Synchronize with playback.
 * @param playback {@link MediaElement} to synchronize with.
 * @param update Callback function.
 */
export function subscribe(
  playback: Seekable,
  update: (t: number) => void,
): () => void {
  const callback = (): void => update(playback.currentTime);

  // subscribe
  playback.addEventListener("seeking", callback);
  playback.addEventListener("timeupdate", callback);

  callback();

  // return unsubscription
  return () => {
    playback.removeEventListener("seeking", callback);
    playback.removeEventListener("timeupdate", callback);
  };
}
