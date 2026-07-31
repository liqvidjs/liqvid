import { type Maybe, None, Some } from "../maybe.mts";

export function safeGet<
  M extends {
    get(key: string): unknown;
    has(key: string): boolean;
  },
>(map: M, key: string): Maybe<NonNullable<ReturnType<M["get"]>>> {
  type T = NonNullable<ReturnType<M["get"]>>;
  if (!map.has(key)) return None;
  return Some(map.get(key) as T);
}
