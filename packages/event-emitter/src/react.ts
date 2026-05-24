"use client";

import { useEffect, useEffectEvent } from "react";

import type { EventsOn, TypedEventTarget } from "./types.ts";

/** Subscribe to events */
export function useEventListener<
  T extends
    | HTMLElement
    | MediaQueryList
    | SVGElement
    | TypedEventTarget<unknown>
    | Window,
  KH extends keyof HTMLElementEventMap,
  KM extends keyof MediaQueryListEventMap,
  KS extends keyof SVGElementEventMap,
  KT extends keyof EventsOn<T>,
  KW extends keyof WindowEventMap,
>(
  /** Target */
  target: T | null | undefined,

  /** Event to subscribe to */
  eventName: T extends TypedEventTarget<unknown>
    ? KT
    : T extends HTMLElement
      ? KH
      : T extends SVGElement
        ? KS
        : T extends MediaQueryList
          ? KM
          : KW,

  /** Event callback to register */
  callback: (
    event: T extends TypedEventTarget<unknown>
      ? EventsOn<T>[KT]
      : T extends HTMLElement
        ? HTMLElementEventMap[KH]
        : T extends SVGElement
          ? SVGElementEventMap[KS]
          : T extends MediaQueryList
            ? MediaQueryListEventMap[KM]
            : WindowEventMap[KW],
  ) => unknown,
) {
  // allow consumers to omit useCallback without messing up the other useEffect
  const callback$ = useEffectEvent(callback);

  useEffect(() => {
    if (!target?.addEventListener) return;

    const listener: typeof callback = (e) => {
      callback$(e);
    };

    // biome-ignore lint/suspicious/noExplicitAny: complicated
    (target as any).addEventListener(eventName, listener);

    return () => {
      // biome-ignore lint/suspicious/noExplicitAny: complicated
      (target as any).removeEventListener(eventName, listener);
    };
  }, [eventName, target]);
}
