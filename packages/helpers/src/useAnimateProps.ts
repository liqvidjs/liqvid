/** biome-ignore-all lint/suspicious/noExplicitAny: variance */

import type {
  AnimateOptions,
  CommonEasingName,
  EasingFunction,
} from "@liqvid/animation";
import type { Duration, DurationLike } from "@liqvid/duration";
import { useTime$ } from "@liqvid/playback/react";
import type { Script } from "@liqvid/script";
import { useScriptOptional } from "@liqvid/script/react";
import { useCallback, useRef } from "react";

type AnyElement = HTMLElement | SVGElement | MathMLElement;

type PropsOptions<
  M extends string,
  T extends AnyElement = AnyElement,
  V extends Record<
    string,
    ((t: Duration) => any) | AnimateOptions<M | DurationLike | number>
  > = Record<string, (t: Duration) => any>,
> = {
  // at?: M | DurationLike;
  get: (args: {
    node: T;
    script: Script<M>;
    values: {
      [key in keyof V]: V[key] extends () => any ? ReturnType<V[key]> : number;
    };
  }) => PropsFromElement<T>;
  values?: V;
};

// 1. Map a DOM element type to its corresponding React props
type PropsFromElement<E extends AnyElement> = {
  [K in keyof React.JSX.IntrinsicElements]: React.JSX.IntrinsicElements[K] extends React.DetailedHTMLProps<
    infer Props,
    E
  >
    ? Props
    : never;
}[keyof React.JSX.IntrinsicElements];

export function useAnimateProps<M extends string>() {
  const handlers = useRef<Map<AnyElement, PropsOptions<M>>>(new Map());
  if (!handlers.current) {
    handlers.current = new Map();
  }

  const script = useScriptOptional<M>();

  useTime$((t) => {
    for (const [node, { get, values }] of handlers.current.entries()) {
      const computedValues = Object.fromEntries(
        Object.entries(values ?? {}).map(([key, fn]) => [key, fn(t)]),
      );

      const attributes = get({ node, script: script!, values: computedValues });

      for (const [attrName, attrValue] of Object.entries(attributes)) {
        if (attrValue === undefined) {
          node.removeAttribute(attrName);
        } else if (attrName === "style" && attrValue !== null) {
          (node as any).style = attrValue;
        } else {
          node.setAttribute(attrName, String(attrValue));
        }
      }
    }
  });

  return useCallback(function props$<
    T extends AnyElement,
    V extends Record<string, (t: Duration) => unknown>,
  >(options: PropsOptions<M, T, V> | PropsKeyframes<M, T>) {
    let prev: T;

    // ref attacher
    return (ref: T | null) => {
      if (prev) {
        handlers.current.delete(prev);
      }
      if (!ref) {
        return;
      }
      prev = ref;

      handlers.current.set(ref, options as any);
    };
  }, []);
}

export type PropsKeyframes<
  M extends string,
  T extends AnyElement,
> = ReadonlyArray<
  PropsFromElement<T> & { easing?: CommonEasingName | EasingFunction } & (
      | {
          at?: undefined;
          duration: DurationLike;
        }
      | {
          at: M;
          duration?: undefined;
        }
    )
>;
