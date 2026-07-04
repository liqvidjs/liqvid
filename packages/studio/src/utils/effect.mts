import { Effect, FileSystem, Option, Schema } from "effect";

import { FileDecodeError } from "./errors.mts";

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

export function loadJsonEffect<
  C extends Schema.Constraint,
  S extends Schema.fromJsonString<C>,
>(parser: S, filename: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const file = yield* fs.readFileString(filename, "utf8");

    return yield* Schema.decodeEffect(parser, { onExcessProperty: "ignore" })(
      file,
    ).pipe(
      Effect.mapError((cause) => new FileDecodeError({ cause, filename })),
    );
  });
}
