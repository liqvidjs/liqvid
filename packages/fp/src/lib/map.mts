import { type Maybe, None, Some } from "../maybe.mts";

export function safeGet<T>(
  map: {
    get(key: string): T | null;
    has(key: string): boolean;
  },
  key: string,
): Maybe<T> {
  if (!map.has(key)) return None;
  return Some(map.get(key) as T);
}
