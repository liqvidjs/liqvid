"use client";

import { useEffect, useRef } from "react";

import type { EventEmitter } from "./index.mts";
import type { EventsOn } from "./types.mts";

/** Subscribe to events on the Window. */
export function useEventListener<E extends keyof WindowEventMap>(
  /** Target */
  target: Window | null | undefined,

  /** Event to subscribe to */
  eventName: E,

  /** Event callback to register */
  callback: (event: WindowEventMap[E]) => unknown,
): void;

/** Subscribe to events on HTML elements */
export function useEventListener<
  T extends HTMLElement,
  E extends keyof HTMLElementEventMap,
>(
  target: T | null | undefined,
  eventName: E,
  callback: (event: HTMLElementEventMap[E]) => void,
): void;

/** Subscribe to events on SVG elements */
export function useEventListener<
  T extends SVGElement,
  E extends keyof SVGElementEventMap,
>(
  target: T | null | undefined,
  eventName: E,
  callback: (event: SVGElementEventMap[E]) => void,
): void;

/** Subscribe to events on {@link EventEmitter}s */
export function useEventListener<
  Target extends EventEmitter<unknown>,
  E extends keyof EventsOn<Target>,
>(
  /** Target */
  target: Target | null | undefined,

  /** Event to subscribe to */
  eventName: E,

  /** Event callback to register */
  callback: (event: EventsOn<Target>[E]) => unknown,
): void;

/** Subscribe to events */
export function useEventListener<
  Target extends Window | EventEmitter<unknown>,
  E extends keyof EventsOn<Target>,
  KW extends keyof WindowEventMap,
>(
  /** Target */
  target: Target | null,

  /** Event to subscribe to */
  eventName: E | KW,

  /** Event callback to register */
  callback: (event: WindowEventMap[KW] | EventsOn<Target>[E]) => unknown,
) {
  const savedCallback = useRef(callback);

  // allow consumers to omit useCallback without messing up the other useEffect
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!target?.addEventListener) return;

    const listener: typeof callback = (e) => savedCallback.current(e);

    // biome-ignore lint/suspicious/noExplicitAny: complicated
    (target as any).addEventListener(eventName, listener);

    return () => {
      // biome-ignore lint/suspicious/noExplicitAny: complicated
      (target as any).removeEventListener(eventName, listener);
    };
  }, [eventName, target]);
}
