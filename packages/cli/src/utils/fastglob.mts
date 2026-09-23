import { Effect, Schema } from "effect";
import type { AbsoluteDir, AbsoluteFile } from "effect-paths";
import fg from "fast-glob";

export class FastGlobError extends Schema.TaggedError<FastGlobError>()(
  "FastGlobError",
  {
    cause: Schema.Defect().pipe(Schema.optional),
  },
  {},
) {}

export function fgEffect(
  source: string | string[],
  options: fg.Options & { absolute: true; cwd?: AbsoluteDir; onlyFiles: true },
): Effect.Effect<readonly AbsoluteFile[], unknown>;
export function fgEffect(
  source: string | string[],
  options?: fg.Options & { cwd?: AbsoluteDir },
): Effect.Effect<readonly string[], unknown> {
  return Effect.tryPromise({
    catch: (cause) => new FastGlobError({ cause }),
    try: () => fg(source, options),
  });
}
