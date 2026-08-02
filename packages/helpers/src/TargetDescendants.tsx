"use client";

import type { DurationLike } from "@liqvid/duration";
import { useMarker, useScript } from "@liqvid/script/react";
import { omit } from "@liqvid/utils";
import * as Slot from "@radix-ui/react-slot";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { useInvisibleClassName } from "./Segment.tsx";

interface AnimationConfig {
  delay?: DurationLike;
  duration: DurationLike;
  easing?: string;
  keyframes: Keyframe[];
}

export type SelectorConfig =
  | {
      class: string;
      id?: undefined;
      selector?: undefined;
    }
  | {
      class?: undefined;
      id: string;
      selector?: undefined;
    }
  | {
      class?: undefined;
      id?: undefined;
      selector: string;
    };

export type TargetConfig<M extends string = string> = SelectorConfig & {
  during?: string;
  from?: M;
  to?: M;

  animate?: AnimationConfig | ((node: Element) => AnimationConfig);
};

type IndexedTransform = SelectorConfig & {
  // animate?: AnimationConfig;
  during?: string;
  fromIndex?: number;
  toIndex?: number;
};

/**
 * Helper to apply transforms to descendants. This is primarily for
 * working with content managed by third-party plugins outside of React,
 * e.g. animating equations rendered by KaTeX.
 */
export function TargetDescendants<M extends string = string>({
  asChild = false,
  children,
  transforms = [],
}: {
  asChild?: boolean;
  children?: React.ReactNode;
  transforms?: TargetConfig<M>[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  const invisibleClassName = useInvisibleClassName();

  const script = useScript();

  const indexedTransforms: IndexedTransform[] = useMemo(() => {
    return transforms.map((t) => {
      const m = omit(t, ["from", "to"]) as IndexedTransform;

      if (t.from) {
        m.fromIndex = script.markers.get(t.from).index;
      }
      if (t.to) {
        m.toIndex = script.markers.get(t.to).index;
      }

      return m as IndexedTransform;
    });
  }, [script, transforms]);

  /** Apply transformations to descendants */
  const update = useCallback(() => {
    const div = ref.current;
    if (!div) return;

    for (const t of indexedTransforms) {
      const matchesDuring =
        t.during === undefined || script.active.name.startsWith(t.during);
      const matchesFrom =
        t.fromIndex === undefined || t.fromIndex <= script.active.index;
      const matchesTo =
        t.toIndex === undefined || script.active.index < t.toIndex;

      const isActive = matchesDuring && matchesFrom && matchesTo;

      let elts: Element[];
      if (t.class) {
        elts = Array.from(div.getElementsByClassName(t.class));
      } else if (t.id) {
        const elt = document.getElementById(t.id);
        elts = elt ? [elt] : [];
      } else if (t.selector) {
        elts = Array.from(div.querySelectorAll(t.selector));
      } else {
        elts = [];
      }

      for (const elt of elts) {
        elt.classList.toggle(invisibleClassName, !isActive);
      }
    }
  }, [indexedTransforms, invisibleClassName, script]);

  // initial render
  // biome-ignore lint/correctness/useExhaustiveDependencies: should only render once
  useEffect(update, []);

  // update when descendants change
  useEffect(() => {
    if (!ref.current) return;

    const observer = new MutationObserver(update);
    observer.observe(ref.current, {
      childList: true,
      subtree: true,
    });

    // disconnect the observer on unmount
    return () => {
      observer.disconnect();
    };
  }, [update]);

  // update on marker change
  useMarker(update);

  const Component = asChild ? Slot.Root : "div";

  return <Component ref={ref}>{children}</Component>;
}
