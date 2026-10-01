import { Duration, type DurationLike } from "@liqvid/duration";

import { type DurationString, isDurationString, parseTimeMs } from "./time.ts";

/**
 * Type representing recorded data
 */
export type ReplayData<K> = [number, K][];

/**
 * Concatenate several ReplayData together, with delays.
 * @param args [ReplayData, delay] objects to join
 * @returns Concatenated replay data
 */
export function concatenateReplayData<T>(
  head: readonly [ReplayData<T>, DurationLike | DurationString | number],
  ...tail: ReadonlyArray<
    readonly [ReplayData<T>, DurationLike | DurationString | number]
  >
) {
  const ret: ReplayData<T> = [...head[0]];
  const headOffset =
    typeof head[1] === "number"
      ? head[1]
      : isDurationString(head[1])
        ? parseTimeMs(head[1])
        : Duration.inMilliseconds(head[1]);

  let ptr = headOffset + length(head[0]);

  for (const [data, start] of tail) {
    const copy = data.slice();
    copy[0] = copy[0]!.slice() as [number, T];

    const offset =
      typeof start === "number"
        ? start
        : isDurationString(start)
          ? parseTimeMs(start)
          : Duration.inMilliseconds(start);

    copy[0]![0] += offset - ptr;
    ret.push(...copy);
    ptr += length(copy);
  }
  return ret;
}

/**
 * Get the total duration of replay data.
 * @param data ReplayData item
 * @returns Duration of replay data
 */
export function length<T>(data: ReplayData<T>) {
  return data.map((_) => _[0]).reduce((a, b) => a + b, 0);
}
