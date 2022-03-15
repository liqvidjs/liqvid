/**
 * Type representing recorded data
 */
export type ReplayData<K> = [number, K][];

/**
 * Concatenate several ReplayData together, with delays.
 * @param args [ReplayData, delay] objects to join
 * @returns Concatenated replay data
 */
export function concat<T>(...args: [ReplayData<T>, number][]) {
  const [head, ...tail] = args;
  const ret: ReplayData<T> = [...head[0]];
  let ptr = head[1] + length(head[0]);

  for (const [data, start] of tail) {
    const copy = data.slice();
    copy[0][0] += start - ptr;
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
  return data.map(_ => _[0]).reduce((a, b) => a+b, 0);
}
