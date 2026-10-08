import type { Progress, SingleBarOptions } from "@liqvid/cli/utils";
import { type Context, Effect, Option, type PlatformError } from "effect";

import type { LoggableJob, StructuredLog } from "../api/schemas";

export { readDirWithFileTypes } from "@liqvid/cli/utils";

/**
 * Treat file not found errors as Option
 * All other errors are left as-is
 */
export const existenceOptional = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<Option.Option<A>, E, R> =>
  effect.pipe(
    Effect.map(Option.some),
    Effect.catch((error) => {
      if (isPlatformError(error) && error.reason._tag === "NotFound") {
        return Effect.succeed(Option.none());
      }
      return Effect.fail(error);
    }),
  );

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
  /** Format element rendered ahead of the value/total pair, e.g. "light". */
  readonly scheme?: string;
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
    readonly #formatValue: (value: number) => string;
    readonly #scheme: string | undefined;

    constructor({ format, formatValue }: SingleBarOptions = {}) {
      this.#formatValue = formatValue ?? String;
      this.#scheme = format?.scheme;
    }

    start(total: number, startValue: number) {
      this.#message = {
        __kind: "progress",
        formattedTotal: this.#formatValue(total),
        formattedValue: this.#formatValue(startValue),
        ...(this.#scheme ? { scheme: this.#scheme } : {}),
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
