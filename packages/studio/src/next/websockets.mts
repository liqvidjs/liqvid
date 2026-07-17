import { NodeSocket } from "@effect/platform-node";
import { Cause, Effect, Fiber, ManagedRuntime, Schema } from "effect";
import { Socket } from "effect/unstable/socket";
import type { NextRequest } from "next/server";
import type { WebSocket, WebSocketServer } from "ws";

import {
  type ChannelMessage,
  type ChannelName,
  EnvelopeFromJson,
} from "../lib/websockets/channels.ts";

import type { DynamicImports } from "./api.mts";

/* ------------------------------ runtime ------------------------------ */
/**
 * Runtime used to run the per-connection socket fibers. It only needs the
 * WebSocket constructor service (unused here, since the server adapts existing
 * sockets rather than dialing out), but providing it keeps the layer complete.
 */
const runtime = ManagedRuntime.make(NodeSocket.layerWebSocketConstructor);

/* ------------------------------ registry ------------------------------ */
type Writer = (frame: string) => Effect.Effect<void, Socket.SocketError>;

/**
 * Connections currently subscribed to each channel, keyed by channel name.
 * Every connection is subscribed to every channel for now; the envelope's
 * `channel` field is what routes messages on the client.
 */
const connections = new Set<Writer>();

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
): Promise<void> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const frame = yield* Schema.encodeEffect(EnvelopeFromJson)({
        channel,
        message,
      });

      yield* Effect.forEach(
        connections,
        (write) => Effect.ignore(write(frame)),
        { concurrency: "unbounded", discard: true },
      );
    }).pipe(Effect.orDie),
  );
}

/* ------------------------------ connection handling ------------------------------ */
/**
 * Adapt a raw `ws` socket into an Effect {@link Socket.Socket}, register it for
 * broadcasts, and run its read loop until the client disconnects.
 */
const handleConnection = (client: WebSocket) =>
  Effect.gen(function* () {
    // The `ws` socket API is structurally compatible with the browser
    // `WebSocket` interface that `fromWebSocket` expects.
    const socket = yield* Socket.fromWebSocket(
      Effect.succeed(client as unknown as globalThis.WebSocket),
    );

    const write = yield* socket.writer;
    connections.add(write);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        connections.delete(write);
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
        Effect.catchCause((cause) =>
          Effect.logDebug("WebSocket connection closed", Cause.pretty(cause)),
        ),
      ),
    );

    client.once("close", () => {
      runtime.runFork(Fiber.interrupt(fiber));
    });
  };
}
