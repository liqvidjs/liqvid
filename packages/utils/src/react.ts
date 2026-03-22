"use client";

import { createContext, useEffect, useReducer, useRef, useState } from "react";

import { anyHover, onDrag as htmlOnDrag } from "./interaction.ts";

/**
 * Create a context guaranteed to be unique. Useful in case multiple versions of package are accidentally loaded.
 * @param name Unique key for context.
 * @param defaultValue Initial value for context.
 * @returns React context which is guaranteed to be stable.
 */
export function createUniqueContext<T>(
  key: string,
  defaultValue: T = undefined as T,
  displayName?: string,
): React.Context<T> {
  const symbol = Symbol.for(key);

  if (!(symbol in globalThis)) {
    const context = createContext<T>(defaultValue);
    context.displayName = displayName;
    (globalThis as unknown as { [symbol]: React.Context<T> })[symbol] = context;
  }

  return (globalThis as unknown as { [symbol]: React.Context<T> })[symbol];
}

/**
 * Combine multiple refs into one
 * @param args Refs to combine
 * @returns A ref which applies all the passed refs
 */
export function combineRefs<T>(
  ...args: (React.Ref<T> | undefined)[]
): (o: T) => void {
  return (o: T) => {
    for (const ref of args) {
      if (typeof ref === "function") {
        ref(o);
      } else if (ref === null) {
      } else if (ref === undefined) {
      } else if (typeof ref === "object" && Object.hasOwn(ref, "current")) {
        ref.current = o;
      }
    }
  };
}

/**
 * Drop-in replacement for onClick handlers which works better on mobile.
 * @param callback Event listener.
 * @returns Props to attach to event target.
 */
export function onClickReact<T extends HTMLElement | SVGElement>(
  callback: (e: React.MouseEvent<T> | React.TouchEvent<T>) => void,
):
  | {
      onTouchStart: React.TouchEventHandler<T>;
      onTouchEnd: React.TouchEventHandler<T>;
    }
  | { onClick: typeof callback } {
  if (anyHover) {
    return { onClick: callback };
  } else {
    let touchId: number | undefined, target: EventTarget & T;

    // touchstart handler
    const onTouchStart: React.TouchEventHandler<T> = (e) => {
      if (typeof touchId === "number") return;
      target = e.currentTarget as T;
      touchId = e.changedTouches[0].identifier;
    };

    // touchend handler
    const onTouchEnd: React.TouchEventHandler<T> = (e) => {
      if (typeof touchId !== "number") return;

      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier !== touchId) continue;

        if (
          target.contains(
            document.elementFromPoint(touch.clientX, touch.clientY),
          )
        ) {
          callback(e);
        }

        touchId = undefined;
        break;
      }
    };

    return { onTouchEnd, onTouchStart };
  }
}

/**
 * Helper for implementing drag functionality, abstracting over mouse vs touch events.
 * @returns An object of event handlers which should be added to a React element with {...}
 */
export function onDragReact(
  move: Parameters<typeof htmlOnDrag>[0],
  down?: Parameters<typeof htmlOnDrag>[1],
  up?: Parameters<typeof htmlOnDrag>[2],
): {
  "data-affords": "click";
  onMouseDown: React.MouseEventHandler;
  onTouchStart: React.TouchEventHandler;
} {
  const listener = htmlOnDrag(move, down, up);

  return {
    "data-affords": "click",
    onMouseDown: (e) => listener(e.nativeEvent),
    onTouchStart: (e) => listener(e.nativeEvent),
  };
}

/**
 * Whether this is the first time a component has rendered.
 *
 * This is often useful for ensuring server-rendered content
 * looks correct before JavaScript has run.
 */
export function useFirstRender() {
  const [isFirstRender, setFirstRender] = useState(true);

  useEffect(() => {
    setFirstRender(false);
  }, []);

  return isFirstRender;
}

/**
 * Get a function to force the component to update
 * @returns A forceUpdate() function
 */
export function useForceUpdate(): () => void {
  return useReducer((c: number) => c + 1, 0)[1];
}

/**
 * Get a promise and resolver
 * @param deps React dependency list
 * @returns [promise, resolve, reject]
 */
export function usePromise(): [Promise<void>, () => void, () => void] {
  const resolve = useRef<() => void>(null);
  const reject = useRef<() => void>(null);

  const [promise] = useState(
    () =>
      new Promise<void>((res, rej) => {
        resolve.current = res;
        reject.current = rej;
      }),
  );

  return [promise, resolve.current!, reject.current!];
}
