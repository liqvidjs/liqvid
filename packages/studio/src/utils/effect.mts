import { Option } from "effect";

export function safeGetOption<
  M extends {
    get(key: string): unknown;
    has(key: string): boolean;
  },
>(map: M, key: string): Option.Option<NonNullable<ReturnType<M["get"]>>> {
  type T = NonNullable<ReturnType<M["get"]>>;

  if (!map.has(key)) return Option.none();
  return Option.some(map.get(key) as T);
}
