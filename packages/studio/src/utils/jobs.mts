import chalk from "chalk";
import { Effect, Logger, type LogLevel, References } from "effect";

import { getServerState } from "../initialize.mts";
import type {
  LoggableJob,
  StructuredLog,
  StructuredLogType,
} from "../types.mts";

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
    const logger = Logger.make(({ date, logLevel, message }) => {
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
        message: message as unknown[],
        timestamp: date,
        type: mappedType,
      });
    });

    const job: LoggableJob<A, E> = {
      fiber: yield* Effect.forkDetach(
        effect.pipe(
          Effect.provideService(References.MinimumLogLevel, "All"),
          Effect.provide(Logger.layer([logger])),
          Effect.onInterrupt(() => {
            console.log(
              chalk.magenta(
                `interrupted fiber ${name}[${options?.path ?? ""}]:${id}`,
              ),
            );

            return Effect.void;
          }),
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
