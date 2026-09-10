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
import type {
  AbsoluteDir,
  RelativeDir,
  RelativeFile,
  RelativePath,
} from "effect-paths";

import type { LoggableJob, StructuredLog } from "../api/schemas.mts";

export const readDirWithFileTypes = Effect.fnUntraced(function* (
  dirname: AbsoluteDir,
  {
    concurrency,
    recursive,
  }: { concurrency?: Concurrency; recursive?: boolean } = {},
) {
  const fs = yield* FileSystem.FileSystem;

  const files = (yield* fs.readDirectory(dirname, {
    recursive,
  })) as RelativePath[];

  return yield* Effect.all(
    files.map((basename) =>
      Effect.gen(function* () {
        const stats = yield* fs.stat(
          path.join(dirname, basename as RelativePath),
        );
        return [basename, stats.type] as
          | [RelativeFile, "File"]
          | [RelativeDir, "Directory"]
          | [RelativePath, "SymbolicLink"];
      }),
    ),
    { concurrency },
  );
});

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

type ProgressMessage = {
  readonly __kind: "progress";
  readonly formattedTotal: string;
  formattedValue: string;
  readonly total: number;
  value: number;
};

/**
 * Callbacks used by {@link jobProgressLayer} to notify when a progress bar is
 * created or mutated, so its state can be streamed to clients in real time.
 */
export interface JobProgressHooks {
  /** Called when a new progress bar log entry is added to the job. */
  onAppend: (log: LoggableJob["logs"][number]) => void;

  /** Called when an existing progress bar's value changes. */
  onUpdate: () => void;
}

/**
 * Log progress bars to a job.
 */
export const jobProgressLayer = (
  job: LoggableJob,
  hooks?: JobProgressHooks,
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
      const log = {
        annotations: {},
        message: [this.#message],
        spans: [],
        timestamp: new Date(),
        type: "log",
      } satisfies StructuredLog;

      if (hooks) {
        hooks.onAppend(log);
      } else {
        job.logs.push(log);
      }
    }

    increment(step = 1) {
      if (!this.#message) return;
      this.#message.value += step;
      this.#message.formattedValue = this.#formatValue(this.#message.value);
      hooks?.onUpdate();
    }

    stop() {
      this.#message = undefined;
    }

    update(current: number) {
      if (!this.#message) return;
      this.#message.value = current;
      this.#message.formattedValue = this.#formatValue(current);
      hooks?.onUpdate();
    }
  },
});
