"use client";

import type { Script } from "@liqvid/script";
import { useMarker, useScript } from "@liqvid/script/react";
import { useFirstRender } from "@liqvid/utils";
import * as Slot from "@radix-ui/react-slot";
import clsx from "clsx";
import {
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { type HidingStrategy, useSegmentContext } from "./SegmentProvider.tsx";

interface SegmentPropsCommon {
  /**
   * If specified, creates a new tag instead of spreading onto the child.
   *
   * This is intended for situations where the tag only exists to apply
   * this transform, in order to avoid excessive tag nesting. We do not
   * support adding additional attributes, since the generics for doing
   * so slow down TypeScript drastically.
   */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
  hideWith?: HidingStrategy;
  style?: React.CSSProperties;
}

interface SegmentPropsDuring {
  during: string;
  from?: undefined;
  to?: undefined;
}

interface SegmentPropsFromTo<M extends string> {
  during?: undefined;
  from: M;
  to?: M;
}

export type SegmentProps<M extends string> = SegmentPropsCommon &
  (SegmentPropsDuring | SegmentPropsFromTo<M>);

export function Segment<M extends string>({
  hideWith,
  ...eitherProps
}: SegmentProps<M>): JSX.Element | null {
  const { during, from, to, as: tag, ...props } = eitherProps;
  const script = useScript<M>();
  const hidingContext = useSegmentContext();
  hideWith ??= hidingContext.hideWith;

  const ref = useRef(null);

  const invisibleClassName = useInvisibleClassName();

  /** Determine if the content is active */
  const getIsActive = useMemo(() => {
    if (typeof during === "string") {
      return (script: Script<M>) => script.active.name.startsWith(during);
    }
    const fromIndex =
      typeof from === "string" ? script.markers.get(from).index : null;
    const toIndex =
      typeof to === "string" ? script.markers.get(to).index : null;

    return (script: Script<M>) => {
      let valid = true;

      if (fromIndex !== null) {
        valid &&= fromIndex <= script.active.index;
      }
      if (toIndex !== null) {
        valid &&= script.active.index < toIndex;
      }

      return valid;
    };
  }, [during, from, to, script]);

  const [isActive, setIsActive] = useState(() => getIsActive(script));

  useMarker(
    useCallback(() => {
      setIsActive(() => getIsActive(script));
    }, [getIsActive, script]),
  );

  // biome-ignore lint/suspicious/noExplicitAny: avoid "union type too complex to represent" warning
  const Component = (tag ?? Slot.Root) as any;

  const isFirstRender = useFirstRender();

  if (!isActive) {
    switch (hideWith) {
      case "invisible":
        return (
          <Component
            {...props}
            aria-hidden
            className={clsx(
              invisibleClassName,
              (props as { className?: string }).className,
            )}
            ref={ref}
            style={
              isFirstRender
                ? { opacity: 0, pointerEvents: "none", ...props.style }
                : props.style
            }
          />
        );
      case "unmount":
        return null;
    }
  }

  return <Component {...props} ref={ref} />;
}

/**
 * Although we explicitly set the opacity/pointerEvents above,
 * we keep this class for use by TargetDescendants
 */
export function useInvisibleClassName() {
  const className = "lv-script-invisible";
  const [added, setAdded] = useState(
    () =>
      typeof globalThis.document !== "undefined" &&
      Boolean(document.querySelector(`style#${className}`)),
  );

  useEffect(() => {
    if (added) return;

    // previous check prevents this instance from re-running but doesn't
    // de-dupe other instances (all the useEffect's will run at the
    // same time after page load)
    if (document.querySelector(`style#${className}`)) return;

    const style = document.createElement("style");
    style.setAttribute("id", className);
    style.setAttribute("type", "text/css");
    style.textContent = `.${className}, .${className} * {
      opacity: 0 !important;
      pointer-events: none !important;
    }`;
    document.head.appendChild(style);

    setAdded(true);
  }, [added]);

  return className;
}
