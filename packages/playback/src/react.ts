import {createContext, useContext, useEffect, useRef} from "react";
import type {Playback} from ".";

/**
 * {@link React.Context} used to access ambient {@link Playback}
 */
export const PlaybackContext = createContext<Playback>(null);

/** Access the ambient {@link Playback} */
export function usePlayback() {
  return useContext(PlaybackContext);
}

/** Register a callback for time update. */
export function useTime(callback: (value: number) => void, deps?: React.DependencyList): void;
export function useTime<T = number>(callback: (value: T) => void, transform?: (t: number) => T, deps?: React.DependencyList): void;
export function useTime<T = number>(callback: (value: T) => void, transform?: ((t: number) => T) | React.DependencyList, deps?: React.DependencyList): void {
  const playback = usePlayback();
  const prev = useRef<T>();

  useEffect(() => {
    const listener =
      typeof transform === "function" ?
      (t: number) => {
        const value = transform(t);
        if (value !== prev.current)
          callback(value);
        prev.current = value;
      } :
      (t: number & T) => {
        if (t !== prev.current)
          callback(t);
        prev.current = t;
      };

    // subscriptions
    playback.on("seek", listener);
    playback.on("timeupdate", listener);

    // initial call
    listener(playback.currentTime);

    // unsubscriptions
    return () => {
      playback.off("seek", listener);
      playback.off("timeupdate", listener);
    };
  }, typeof transform === "function" ? deps : transform);
}
