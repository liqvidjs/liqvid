import path from "node:path";

import type { Progress, SingleBarOptions } from "@liqvid/cli/utils";
import {
  type Context,
  Effect,
  FileSystem,
  Option,
  type PlatformError,
} from "effect";
import type { Concurrency } from "effect/Types";

import type { LoggableJob } from "../types.mts";

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

/**
 * Treat file not found errors as Option
 * All other errors are left as-is
 */
export const existenceOptional = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<Option.Option<A>, E, R> => {
  return effect.pipe(
    Effect.map(Option.some),
    Effect.catch((error) => {
      if (isPlatformError(error) && error.reason._tag === "NotFound") {
        return Effect.succeed(Option.none());
      }
      return Effect.fail(error);
    }),
  );
};

function isPlatformError(error: unknown): error is PlatformError.PlatformError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    (error as PlatformError.PlatformError)._tag === "PlatformError"
  );
}

interface ProgressMessage {
  __kind: "progress";
  total: number;
  value: number;
  formattedTotal: string;
  formattedValue: string;
}

/**
 * Log progress bars to a job.
 */
export const jobProgressLayer = <A, E>(
  job: LoggableJob<A, E>,
): Context.Service.Shape<typeof Progress> => ({
  SingleBar: class SingleBar {
    #message: ProgressMessage | undefined;
    #formatValue: (value: number) => string;

    constructor({ formatValue }: SingleBarOptions = {}) {
      this.#formatValue = formatValue ?? String;
    }

    start(total: number, startValue: number) {
      this.#message = {
        __kind: "progress",
        formattedTotal: this.#formatValue(total),
        formattedValue: this.#formatValue(startValue),
        total,
        value: startValue,
      };
      job.logs.push({
        message: [this.#message],
        timestamp: new Date(),
        type: "log",
      });
    }

    increment(step = 1) {
      if (!this.#message) return;
      this.#message.value += step;
      this.#message.formattedValue = this.#formatValue(this.#message.value);
    }

    stop() {
      this.#message = undefined;
    }

    update(current: number) {
      if (!this.#message) return;
      this.#message.value = current;
      this.#message.formattedValue = this.#formatValue(current);
    }
  },
});
