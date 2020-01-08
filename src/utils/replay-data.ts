export type ReplayData<K> = [number, K][];

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

export function length<T>(data: ReplayData<T>) {
  return data.map(_ => _[0]).reduce((a, b) => a+b, 0);
}
