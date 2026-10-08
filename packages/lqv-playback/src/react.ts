"use client";

import { createContext, useContext, useEffect, useRef } from "react";

import type { Seekable } from "./index.ts";

const symbol = Symbol.for("@lqv/playback");
const renderModeSymbol = Symbol.for("@lqv/playback/renderMode");

/**
 *  TODO: figure out where this should be centralized; don't really want to depend on @liqvid/player here
 * - `cli`: rendering in a CLI environment. Not currently used, but reserved for future use.
 * - `screenshot`: rendering to take a screenshot of one frame
 * - `thumbs`: rendering to generate thumbnails
 * - `video`: static video export
 * - `web`: the default experience
 * */
export type RenderMode = "cli" | "screenshot" | "thumbnails" | "video" | "web";

type GlobalThis = typeof globalThis & {
  [symbol]: React.Context<Seekable | null>;
  [renderModeSymbol]: React.Context<RenderMode>;
};

if (!(symbol in globalThis)) {
  // Seekable context
  const Seekable = createContext<Seekable | null>(null);
  Seekable.displayName = "Seekable";
  (globalThis as GlobalThis)[symbol] = Seekable;
}

if (!(renderModeSymbol in globalThis)) {
  // RenderMode context
  const RenderMode = createContext<RenderMode>("web");
  RenderMode.displayName = "RenderMode";
  (globalThis as GlobalThis)[renderModeSymbol] = RenderMode;
}

/**
 * Access the ambient {@link Seekable}
 */
export function useSeekable(): Seekable {
  const seekable = useSeekableOptional();
  if (!seekable) {
    throw new Error("no ambient Seekable");
  }
  return seekable;
}

/**
 * Access the ambient {@link Seekable}
 */
export function useSeekableOptional(): Seekable | null {
  return useContext(SeekableContext);
}

/**
 * {@link React.Context} used to access ambient {@link Seekable} or (deprecated) {@link Playback}
 */
export const SeekableContext = (globalThis as unknown as GlobalThis)[symbol];
SeekableContext.displayName = "Seekable";

/** Register a callback for time update. */
export function useTime(callback: (value: number) => void): void;
export function useTime<T = number>(
  callback: (value: T) => void,
  transform?: (t: number) => T,
): void;
export function useTime<T = number>(
  callback: (value: T) => void,
  transform?: React.DependencyList | ((t: number) => T),
): void {
  const playback = useSeekable();
  const prev = useRef<T>(null);

  useEffect(() => {
    const listener =
      typeof transform === "function"
        ? () => {
            const value = transform(playback.currentTime);
            if (value !== prev.current) callback(value);
            prev.current = value;
          }
        : () => {
            const t = playback.currentTime as unknown as T;
            if (t !== prev.current) callback(t);
            prev.current = t;
          };

    // subscriptions
    playback.addEventListener("seeking", listener);
    playback.addEventListener("timeupdate", listener);

    // initial call
    listener();

    // unsubscriptions
    return () => {
      playback.removeEventListener("seeking", listener);
      playback.removeEventListener("timeupdate", listener);
    };
  }, [callback, playback, transform]);
}

/**
 * {@link React.Context} used to access current rendering mode
 * - `screenshot`: rendering to take a screenshot of one frame
 * - `thumbs`: rendering to generate thumbnails
 * - `video`: static video export
 * - `web`: the default experience
 */
export const RenderMode = (globalThis as GlobalThis)[renderModeSymbol];
