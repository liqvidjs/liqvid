import path from "node:path";

import { Effect, FileSystem, Option } from "effect";
import type { Concurrency } from "effect/Types";

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

export function readDirWithFileTypes(
  dirname: string,
  {
    concurrency,
    recursive,
  }: { concurrency?: Concurrency; recursive?: boolean } = {},
) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const files = yield* fs.readDirectory(dirname, { recursive });

    return yield* Effect.all(
      files.map((basename) =>
        Effect.gen(function* () {
          const stats = yield* fs.stat(path.join(dirname, basename));
          return [basename, stats] as const;
        }),
      ),
      { concurrency },
    );
  });
}
