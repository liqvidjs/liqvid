"use client";

import type { CleanUpFn } from "@liqvid/utils";
import { Cause, Effect, Fiber, ManagedRuntime, Schema } from "effect";
import { Socket } from "effect/unstable/socket";
import { createContext, useContext, useEffect, useMemo } from "react";

import {
  type ChannelMessage,
  type ChannelName,
  type Channels,
  EnvelopeFromJson,
} from "../lib/websockets/channels.ts";

/**
 * Subscriber callback: receives the full decoded message for a channel.
 */
type Subscriber<C extends ChannelName> = (message: ChannelMessage<C>) => void;

/**
 * Effect runtime that provides the browser `WebSocket` constructor to the
 * socket layer.
 */
const runtime = ManagedRuntime.make(Socket.layerWebSocketConstructorGlobal);


/**
 * Wraps a single WebSocket connection, decoding envelope frames and fanning
 * them out to per-channel subscribers.
 */
class WebSocketClient {
  #subscribers = new Map<ChannelName, Set<Subscriber<ChannelName>>>();
  #fiber: Fiber.Fiber<void> | undefined;
  #write:
    | ((frame: string) => Effect.Effect<void, Socket.SocketError>)
    | undefined;

  constructor(url: string) {
    this.#fiber = runtime.runFork(
      Effect.gen({ self: this }, function* () {
        const socket = yield* Socket.makeWebSocket(toAbsoluteUrl(url));

        this.#write = yield* socket.writer;

        yield* socket.runString((data) =>
          Schema.decodeEffect(EnvelopeFromJson)(data).pipe(
            Effect.andThen(({ channel, message }) => {
              const subscribers = this.#subscribers.get(channel);
              if (!subscribers) return Effect.void;

              for (const cb of subscribers) {
                cb(message as ChannelMessage<ChannelName>);
              }
              return Effect.void;
            }),
            Effect.catchTag("SchemaError", (error) =>
              Effect.logWarning("Received malformed WebSocket frame", error),
            ),
          ),
        );
      }).pipe(
        Effect.scoped,
        Effect.catchCause((cause) =>
          Effect.logDebug("WebSocket connection closed", Cause.pretty(cause)),
        ),
      ),
    );
  }

  close() {
    if (this.#fiber) {
      runtime.runFork(Fiber.interrupt(this.#fiber));
      this.#fiber = undefined;
    }
  }

  /**
   * Send a message on a channel to the server.
   */
  send<C extends ChannelName>(channel: C, message: ChannelMessage<C>): void {
    const write = this.#write;
    if (!write) return;

    runtime.runFork(
      Schema.encodeEffect(EnvelopeFromJson)({ channel, message }).pipe(
        Effect.andThen(write),
        Effect.ignore,
      ),
    );
  }

  subscribe<C extends ChannelName>(channel: C, cb: Subscriber<C>): CleanUpFn {
    let set = this.#subscribers.get(channel);
    if (!set) {
      set = new Set();
      this.#subscribers.set(channel, set);
    }
    set.add(cb as Subscriber<ChannelName>);

    return () => {
      set.delete(cb as Subscriber<ChannelName>);
    };
  }
}

/** Resolve a possibly-relative URL against the current page origin as ws(s). */
function toAbsoluteUrl(url: string): string {
  if (/^wss?:\/\//.test(url)) return url;
  const { protocol, host } = window.location;
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${host}${url}`;
}

const WebSocketContext = createContext<WebSocketClient | null>(null);

/** @scopeException ../../app/providers.tsx */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new WebSocketClient("/api/liqvid/ws");
  }, []);

  useEffect(() => {
    return () => {
      client?.close();
    };
  }, [client]);

  return (
    <WebSocketContext.Provider value={client}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Subscribe to messages on a channel. Each key of `callbacks` corresponds to a
 * message `type` for that channel, and receives that message's `data` payload.
 *
 * @example
 * ```tsx
 * useChannel("jobs", {
 *   deleteJob: (data) => { console.log(data.id); },
 *   newJob: (data) => { console.log(data.job.name); },
 * });
 * ```
 *
 * @scope ..
 * @scopeException ../../app
 */
export function useChannel<C extends ChannelName>(
  channel: C,
  callbacks: Partial<{
    [M in keyof Channels[C]]: (data: Channels[C][M]) => void;
  }>,
  enabled = true,
): void {
  const client = useContext(WebSocketContext);

  useEffect(() => {
    if (!enabled || !client) return;

    return client.subscribe(channel, (message) => {
      const handler = (
        callbacks as Record<string, ((data: unknown) => void) | undefined>
      )[message.type];
      handler?.(message.data);
    });
  }, [client, callbacks, enabled, channel]);
}
