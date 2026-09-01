import { NodeSocket } from "@effect/platform-node";
import { serialize } from "@liqvid/ssr/serde";
import {
  Effect,
  Fiber,
  Logger,
  ManagedRuntime,
  References,
  Schema,
} from "effect";
import { Socket } from "effect/unstable/socket";
import type { NextRequest } from "next/server";
import type { WebSocket, WebSocketServer } from "ws";

import { getServerState } from "#_/initialize.mjs";
import {
  type ChannelMessage,
  type ChannelName,
  EnvelopeFromJson,
} from "#_/lib/websockets/channels.js";
import { getLogLevel } from "#_/utils/misc.mjs";

import type { DynamicImports } from "./api.mts";

/* ------------------------------ runtime ------------------------------ */
/**
 * Runtime used to run the per-connection socket fibers. It only needs the
 * WebSocket constructor service (unused here, since the server adapts existing
 * sockets rather than dialing out), but providing it keeps the layer complete.
 */
const runtime = ManagedRuntime.make(NodeSocket.layerWebSocketConstructor);

/**
 * Broadcast a message on a channel to every connected client.
 *
 * @example
 * ```ts
 * await broadcast("jobs", { type: "newJob", data: { job: { name: "render" } } });
 * ```
 */
export function broadcast<C extends ChannelName>(
  channel: C,
  message: ChannelMessage<C>,
) {
  const { wsConnections } = getServerState();

  return Effect.gen(function* () {
    const frame = yield* Schema.encodeEffect(EnvelopeFromJson)(
      serialize({
        channel,
        message,
      }),
    );

    yield* Effect.logDebug("broadcasting WebSocket message");

    yield* Effect.forEach(
      wsConnections,
      (write) => Effect.ignore(write(frame)),
      {
        concurrency: "unbounded",
        discard: true,
      },
    );
  }).pipe(
    Effect.annotateLogs({ channel, connections: wsConnections.size, message }),
    Effect.orDie,
  );
}

/* ------------------------------ connection handling ------------------------------ */
/**
 * Adapt a raw `ws` socket into an Effect {@link Socket.Socket}, register it for
 * broadcasts, and run its read loop until the client disconnects.
 */
const handleConnection = (client: WebSocket) =>
  Effect.gen(function* () {
    const { wsConnections } = getServerState();
    // The `ws` socket API is structurally compatible with the browser
    // `WebSocket` interface that `fromWebSocket` expects.
    const socket = yield* Socket.fromWebSocket(
      Effect.succeed(client as unknown as globalThis.WebSocket),
    );

    const write = yield* socket.writer;
    yield* Effect.logDebug("new WebSocket connection");
    wsConnections.add(write);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        wsConnections.delete(write);
      }),
    );

    // Run the read loop. Incoming frames are decoded envelopes; the server
    // currently does not act on client-sent messages, but decoding validates
    // the wire format and surfaces malformed frames.
    yield* socket.runString((data) =>
      Schema.decodeEffect(EnvelopeFromJson)(data).pipe(
        Effect.catchTag("SchemaError", (error) =>
          Effect.logWarning("Received malformed WebSocket frame", error),
        ),
      ),
    );
  }).pipe(Effect.scoped);

/**
 * Liqvid server UPGRADE handler
 */
export function upgradeHandler(_dynamicImports: DynamicImports) {
  return async function UPGRADE(
    client: WebSocket,
    _server: WebSocketServer,
    _request: NextRequest,
    _context: unknown,
  ) {
    const fiber = runtime.runFork(
      handleConnection(client).pipe(
        // Effect.catchCause((cause) =>
        //   Effect.logDebug("WebSocket connection closed", Cause.pretty(cause)),
        // ),
        Effect.provideService(References.MinimumLogLevel, getLogLevel()),
        Effect.provide(Logger.layer([Logger.consolePretty()])),
      ),
    );

    client.once("close", () => {
      runtime.runFork(Fiber.interrupt(fiber));
    });
  };
}
