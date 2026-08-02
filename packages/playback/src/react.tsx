"use client";

import { Duration } from "@liqvid/duration";
import { useEventListener } from "@liqvid/event-emitter/react";
import {
  type BooleanValueConfig,
  type NumericValueConfig,
  usePersist,
} from "@liqvid/hydration";
import { usePluginApi } from "@liqvid/studio-plugin-api";
import { makeContext } from "@liqvid/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Playback } from "./Playback.mts";
import type {
  CorePlayback,
  PlaybackEvent,
  PlaybackEventsMap,
} from "./synthetic-playback.mts";
import { useEager } from "./useEager.ts";

/**
 * {@link React.Context} used to access ambient {@link Playback}
 */
const PlaybackContext = makeContext<Playback | undefined>({
  defaultValue: undefined,
  name: "Playback",
  uniqueKey: "@lqv/playback",
});

export function PlaybackProvider({
  children,
  restore,
  value,
}: {
  children?: React.ReactNode;
  restore?: {
    muted?: BooleanValueConfig;
    volume?: NumericValueConfig;
  };
  value?: Playback;
}) {
  /* ------------------------------ eager restoration of values ------------------------------ */
  const [getMuted] = usePersist(restore?.muted, {
    default: false,
    disabled: restore?.muted === undefined,
  });

  const [getVolume] = usePersist(restore?.volume, {
    default: 1,
    disabled: restore?.volume === undefined,
  });

  useEager(() => {
    if (!value) return;

    if (restore?.muted) {
      value.muted = getMuted();
    }

    if (restore?.volume) {
      value.volume = getVolume();
    }
  }, value);

  /* ------------------------------ update duration ------------------------------ */
  const { setDuration } = usePluginApi();

  const updateDuration = useCallback(() => {
    if (value) {
      setDuration(value.duration$);
    }
  }, [value, setDuration]);

  useEffect(() => updateDuration(), [updateDuration]);

  useEventListener(value, "durationchange", updateDuration);

  /* ------------------------------ render ------------------------------ */
  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}

/**
 * Access the ambient {@link Playback}.
 * @throws Error if no playback is available.
 */
export const usePlayback = PlaybackContext.use;

/**
 * Access the ambient {@link Playback}, or undefined if none available.
 */
export const usePlaybackOptional = PlaybackContext.useOptional;

/** Callback with current time as a {@link Duration} */
export function useTime$(
  callback: (t: Duration, prev: Duration) => unknown,
): void;

/** Callback with current time as a {@link Duration}, and selector function */
export function useTime$<T>(
  selector: (t: Duration) => T,
  callback: (active: T, prev: T) => unknown,
): void;

export function useTime$<T>(
  ...args:
    | []
    | [callback: (t: Duration, prev: Duration) => unknown]
    | [selector: (t: Duration) => T, callback: (value: T, prev: T) => unknown]
) {
  const playback = usePlayback();

  const selector: (t: Duration) => T = useMemo(() => {
    if (args.length < 2) return (t: Duration) => t as unknown as T;
    return args[0] as unknown as (t: Duration) => T;
  }, [args.length, args[0]]);

  const [[$prev, { setMilliseconds: setPrevTimeMs }]] = useState(() =>
    Duration.withSetter({ seconds: playback.currentTime }),
  );
  const prevValue = useRef<T>(selector(playback.currentTime$));

  const check = useCallback(() => {
    switch (args.length) {
      case 1:
        args[0](playback.currentTime$, $prev);
        break;
      case 2: {
        const value = args[0](playback.currentTime$);
        if (value !== prevValue.current) {
          args[1](value, prevValue.current);
          prevValue.current = value;
        }
      }
    }

    setPrevTimeMs(playback.currentTime$.inMilliseconds());
  }, [args.length, args[0], args[1], playback, $prev, setPrevTimeMs]);

  usePlaybackEvent("timeupdate", check);
}

/** Callback with current time as a number (in seconds) */
export function useTime(callback: (t: number, prev: number) => unknown): void;

/** Callback with current time as a number (in seconds), and selector function */
export function useTime<T>(
  selector: (t: number) => T,
  callback: (active: T, prev: T) => unknown,
): void;

export function useTime<T>(
  ...args:
    | []
    | [callback: (t: number, prev: number) => unknown]
    | [selector: (t: number) => T, callback: (value: T, prev: T) => unknown]
) {
  const playback = usePlayback();

  const selector: (t: number) => T = useMemo(() => {
    if (args.length < 2) return (t: number) => t as unknown as T;
    return args[0] as unknown as (t: number) => T;
  }, [args.length, args[0]]);

  const prevTime = useRef<number>(playback.currentTime);
  const prevValue = useRef<T>(selector(playback.currentTime));

  const check = useCallback(() => {
    switch (args.length) {
      case 1:
        args[0](playback.currentTime, prevTime.current);
        break;
      case 2: {
        const value = args[0](playback.currentTime);
        if (value !== prevValue.current) {
          args[1](value, prevValue.current);
          prevValue.current = value;
        }
      }
    }

    prevTime.current = playback.currentTime;
  }, [args.length, args[0], args[1], playback]);

  usePlaybackEvent("timeupdate", check);
}

/** Subscribe to playback events. */
export function usePlaybackEvent<
  E extends PlaybackEvent,
  P extends CorePlayback = Playback,
>(
  /** Event to subscribe to */
  eventName: E,

  /** Event callback to register */
  callback: (event: PlaybackEventsMap<P>[E]) => unknown,
) {
  // @ts-expect-error TODO: fix this
  useEventListener(usePlaybackOptional(), eventName, callback);
}

export function useReadyStateItem(defaultValue = 4) {
  const [readyState, setReadyState] = useState(defaultValue);

  const [item] = useState(() => ({
    readyState,
  }));

  const playback = usePlayback();

  useEffect(() => {
    playback.registerReadyStateItem(item);

    return () => {
      playback.unregisterReadyStateItem(item);
    };
  }, [playback, item]);

  useEffect(() => {
    playback.updateReadyStateItem(item, readyState);
  }, [playback, item, readyState]);

  return { readyState, setReadyState };
}
