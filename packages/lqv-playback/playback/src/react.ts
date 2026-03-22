"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import type { Playback } from ".";
import { PlaybackMEProxy } from "./hack";
import type { MediaElement } from "./MediaElement";

type GlobalThis = {
  [symbol]: React.Context<MediaElement>;
};

const symbol = Symbol.for("@lqv/playback");

if (!(symbol in globalThis)) {
  (globalThis as unknown as GlobalThis)[symbol] =
    createContext<MediaElement>(null);
}

/**
 * Access the ambient {@link MediaElement}
 */
export function useME(): MediaElement {
  const playback = usePlayback();
  // do not use playback.constructor.name === "Playback"
  // because minimization can mangle that
  if (playback && "__advance" in playback) {
    return new Proxy(usePlayback(), PlaybackMEProxy) as unknown as MediaElement;
  }
  return playback as unknown as MediaElement;
}

/**
 * {@link React.Context} used to access ambient {@link MediaElement} or (deprecated) {@link Playback}
 */
export const PlaybackContext = (globalThis as unknown as GlobalThis)[symbol];
PlaybackContext.displayName = "Playback";

/**
 * Access the ambient {@link Playback}.
 *
 * @deprecated This function is only kept for backwards compatibility with
 * Liqvid. New code should target the {@link MediaElement} interface. You
 * probably want {@link useME}.
 */
export function usePlayback(): Playback {
  return useContext(PlaybackContext) as unknown as Playback;
}

/** Register a callback for time update. */
export function useTime(
  callback: (value: number) => void,
  deps?: React.DependencyList,
): void;
export function useTime<T = number>(
  callback: (value: T) => void,
  transform?: (t: number) => T,
  deps?: React.DependencyList,
): void;
export function useTime<T = number>(
  callback: (value: T) => void,
  transform?: React.DependencyList | ((t: number) => T),
  deps?: React.DependencyList,
): void {
  const playback = useME();
  const prev = useRef<T>();

  useEffect(
    () => {
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
    },
    typeof transform === "function" ? deps : transform,
  );
}
