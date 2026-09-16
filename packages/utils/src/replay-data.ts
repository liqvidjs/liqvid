import { Duration, type DurationLike } from "@liqvid/duration";

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
  head: readonly [ReplayData<T>, DurationLike | number],
  ...tail: ReadonlyArray<readonly [ReplayData<T>, DurationLike | number]>
) {
  const ret: ReplayData<T> = [...head[0]];
  let ptr =
    (typeof head[1] === "number" ? head[1] : Duration.inMilliseconds(head[1])) +
    length(head[0]);

  for (const [data, start] of tail) {
    const copy = data.slice();
    copy[0] = copy[0]!.slice() as [number, T];

    copy[0]![0] +=
      (typeof start === "number" ? start : Duration.inMilliseconds(start)) -
      ptr;
    console.debug("offset", copy[0][0]);
    ret.push(...copy);
    ptr += length(copy);
  }
  return ret;
}

/** @deprecated */
export const concat = concatenateReplayData;

/**
 * Get the total duration of replay data.
 * @param data ReplayData item
 * @returns Duration of replay data
 */
export function length<T>(data: ReplayData<T>) {
  return data.map((_) => _[0]).reduce((a, b) => a + b, 0);
}
