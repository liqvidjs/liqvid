"use client";

import { createContext, useContext, useEffect, useRef } from "react";

import type { Seekable } from ".";

type GlobalThis = {
  [symbol]: React.Context<Seekable | null>;
};

const symbol = Symbol.for("@lqv/playback");

if (!(symbol in globalThis)) {
  (globalThis as unknown as GlobalThis)[symbol] =
    createContext<Seekable | null>(null);
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
