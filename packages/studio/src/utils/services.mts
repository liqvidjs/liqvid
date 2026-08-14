import { NodeFileSystem } from "@effect/platform-node";
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
  Service,
  ServiceClient,
  StructuredLog,
  StructuredLogType,
} from "../api/schemas.mts";
import { getServerState } from "../initialize.mts";
import { broadcast } from "../next/websockets.mts";

import { getLogLevel } from "./misc.mts";

/**
 * Strip the (non-serializable) fiber from a service to get the client-facing
 * snapshot broadcast over WebSockets.
 */
function toClientService(service: Service): ServiceClient {
  const { fiber: _fiber, ...clientService } = service;
  return clientService;
}

/** Broadcast a service's current state to all connected clients. */
function broadcastServiceUpdate(service: Service) {
  return broadcast("services", {
    data: { service: toClientService(service) },
    type: "updateService",
  });
}

/**
 * Append a log entry to a service and stream it to connected clients so the
 * jobs page updates in real time. Broadcasting is fire-and-forget: it runs in a
 * detached fiber so synchronous callers (the logger) aren't blocked.
 */
function appendLog(service: Service, log: StructuredLog) {
  service.logs.push(log);
  Effect.runFork(
    broadcast("services", {
      data: { id: service.id, log },
      type: "appendLog",
    }),
  );
}

/**
 * Start a long-running service in a detached fiber and add it to the global
 * list of services.
 *
 * Unlike {@link createJob}, a service is not expected to complete: it runs for
 * the lifetime of the process. Its state transitions to `failed` if the effect
 * errors, or `stopped` if it is interrupted or completes.
 *
 * All log output from the effect (via `Effect.log*`) is captured, tagged with
 * its level, and streamed to the Jobs page.
 */
export function createService<A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>,
) {
  return Effect.gen(function* () {
    yield* Effect.logDebug("starting service", { name });
    const { services } = getServerState();
    const startTime = new Date();

    const logs: StructuredLog[] = [];
    const id = crypto.randomUUID();

    // Custom logger that captures log messages into the service.
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

      appendLog(service, {
        annotations,
        message: message as ReadonlyArray<Schema.Json>,
        spans: activeSpans.map(([label, start]) => [label, timestamp - start]),
        timestamp: date,
        type: mappedType,
      });
    });

    const service: Types.Mutable<Service> = {
      fiber: yield* Effect.forkDetach(
        effect.pipe(
          Effect.provide(NodeFileSystem.layer),

          // logging
          Effect.provideService(References.MinimumLogLevel, getLogLevel()),
          Effect.provide(Logger.layer([logger])),

          // mark stopped on interrupt
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              service.state = "stopped";
            }).pipe(Effect.andThen(() => broadcastServiceUpdate(service))),
          ),
          // mark failed
          Effect.tapError(() =>
            Effect.sync(() => {
              service.state = "failed";
            }).pipe(Effect.andThen(() => broadcastServiceUpdate(service))),
          ),
          // mark stopped when the effect returns (services normally run forever)
          Effect.tap(
            Effect.sync(() => {
              service.state = "stopped";
            }).pipe(Effect.andThen(() => broadcastServiceUpdate(service))),
          ),
        ),
      ),
      id,
      logs,
      name,
      startTime,
      state: "running",
    };

    services.set(id, service);

    // Announce the new service to connected clients.
    yield* broadcast("services", {
      data: { service: toClientService(service) },
      type: "newService",
    });

    return service;
  }).pipe(Effect.provideService(References.MinimumLogLevel, getLogLevel()));
}
