import { Progress } from "@liqvid/cli/utils";
import { Effect, Logger, type LogLevel, References } from "effect";

import type {
  LoggableJob,
  StructuredLog,
  StructuredLogType,
} from "../api/schemas.mts";
import { getServerState } from "../initialize.mts";

import { jobProgressLayer } from "./effect.mts";

/**
 * Start a job in a detached fiber and add it to the global list of jobs.
 */
export function createJob<A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>,
  options?: {
    path?: string;
  },
) {
  return Effect.gen(function* () {
    const { jobs } = getServerState();
    const startTime = new Date();

    const logs: StructuredLog[] = [];
    const id = crypto.randomUUID();

    // Custom logger that outputs log messages to the console
    const logger = Logger.make(({ date, fiber, logLevel, message }) => {
      const annotations = fiber.getRef(References.CurrentLogAnnotations);
      const mappedType = (
        {
          All: "log",
          Debug: "debug",
          Error: "error",
          Fatal: "error",
          Info: "info",
          None: "log",
          Trace: "debug",
          Warn: "warn",
        } satisfies Record<LogLevel.LogLevel, StructuredLogType>
      )[logLevel];

      logs.push({
        annotations,
        message: message as unknown[],
        timestamp: date,
        type: mappedType,
      });
    });

    const job: LoggableJob<A, E> = {
      fiber: yield* Effect.forkDetach(
        effect.pipe(
          // logging
          Effect.provideService(References.MinimumLogLevel, "All"),
          Effect.provide(Logger.layer([logger])),

          Effect.provideServiceEffect(
            Progress,
            Effect.suspend(() => Effect.succeed(jobProgressLayer(job))),
          ),

          // mark cancelled
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              job.state = "cancelled";
            }),
          ),
          // mark failed
          Effect.tapError(() =>
            Effect.sync(() => {
              job.state = "failed";
            }),
          ),
          // mark completed
          Effect.tap(
            Effect.sync(() => {
              job.state = "completed";
            }),
          ),
        ),
      ),
      id,
      logs,
      name,
      startTime,
      state: "running",
      ...options,
    };

    jobs.new.set(id, job);

    return job;
  });
}
