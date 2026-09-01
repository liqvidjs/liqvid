import { Progress } from "@liqvid/cli/utils";
import {
  Effect,
  Logger,
  type LogLevel,
  type Record,
  References,
  type Schema,
  type Types,
} from "effect";

import type {
  LoggableJob,
  LoggableJobClient,
  StructuredLog,
  StructuredLogType,
} from "#_/api/schemas.mjs";
import { getServerState } from "#_/initialize.mjs";
import { broadcast } from "#_/next/websockets.mjs";

import { jobProgressLayer } from "./effect.mts";
import { getLogLevel } from "./misc.mts";

/**
 * Strip the (non-serializable) fiber from a job to get the client-facing
 * snapshot broadcast over WebSockets.
 */
function toClientJob(job: LoggableJob): LoggableJobClient {
  const { fiber: _fiber, ...clientJob } = job;
  return clientJob;
}

/** Broadcast a job's current state to all connected clients. */
function broadcastJobUpdate(job: LoggableJob) {
  return broadcast("jobs", {
    data: { job: toClientJob(job) },
    type: "updateJob",
  });
}

/**
 * Append a log entry to a job and stream it to connected clients so the jobs
 * page updates in real time. Broadcasting is fire-and-forget: it runs in a
 * detached fiber so synchronous callers (the logger, progress bars) aren't
 * blocked.
 */
function appendLog(job: LoggableJob, log: StructuredLog) {
  job.logs.push(log);
  Effect.runFork(
    broadcast("jobs", { data: { id: job.id, log }, type: "appendLog" }),
  );
}

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
      const annotations = fiber.getRef(
        References.CurrentLogAnnotations,
      ) as Record.ReadonlyRecord<string, Schema.Json>;
      const activeSpans = fiber.getRef(References.CurrentLogSpans);

      const timestamp = date.getTime();

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

      appendLog(job, {
        annotations,
        message: message as ReadonlyArray<Schema.Json>,
        spans: activeSpans.map(([label, start]) => [label, timestamp - start]),
        timestamp: date,
        type: mappedType,
      });
    });

    const job: Types.Mutable<LoggableJob> = {
      fiber: yield* Effect.forkDetach(
        effect.pipe(
          // logging
          Effect.provideService(References.MinimumLogLevel, getLogLevel()),
          Effect.provide(Logger.layer([logger])),

          Effect.provideServiceEffect(
            Progress,
            Effect.suspend(() =>
              Effect.succeed(
                jobProgressLayer(job, {
                  // A new progress bar is a new log entry: append + stream it.
                  onAppend: (log) => appendLog(job, log),
                  // Progress bars mutate an existing entry in place; re-send the
                  // whole job so clients reflect the updated value.
                  onUpdate: () => {
                    Effect.runFork(broadcastJobUpdate(job));
                  },
                }),
              ),
            ),
          ),

          // mark cancelled
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              job.state = "cancelled";
            }).pipe(Effect.andThen(() => broadcastJobUpdate(job))),
          ),
          // mark failed
          Effect.tapError(() =>
            Effect.sync(() => {
              job.state = "failed";
            }).pipe(Effect.andThen(() => broadcastJobUpdate(job))),
          ),
          // mark completed
          Effect.tap(
            Effect.sync(() => {
              job.state = "completed";
            }).pipe(Effect.andThen(() => broadcastJobUpdate(job))),
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

    // Announce the new job to connected clients.
    yield* broadcast("jobs", {
      data: { job: toClientJob(job) },
      type: "newJob",
    });

    return job;
  });
}
