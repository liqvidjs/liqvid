"use client";

import { Duration, type DurationLike } from "@liqvid/duration";
import { useEventListener } from "@liqvid/event-emitter/react";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import { RenderMode } from "@lqv/playback/react";
import clsx from "clsx";
import { use, useCallback, useEffect, useRef } from "react";

import { usePrivatePlayerApi } from "./private-api.ts";
import { isInteractiveElement } from "./utils.ts";

/** Container for the player controls */
export function Controls({
  className,
  children,
  hideAfter,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  /** If specified, controls will auto-hide after this duration. */
  hideAfter?: DurationLike;
}) {
  const renderMode = use(RenderMode);
  const { setControls } = usePrivatePlayerApi();
  const playback = usePlayback();

  const isActive = renderMode === "web";

  const timer = useRef(0);

  /** reset the hiding timer */
  const resetTimer = useCallback(
    (e: unknown) => {
      if (playback.paused || !hideAfter) return;

      // allow keyboard input on elements
      if (e instanceof KeyboardEvent) {
        if (
          (!(e.altKey || e.ctrlKey || e.metaKey) &&
            e.target &&
            e.target instanceof HTMLElement) ||
          e.target instanceof SVGElement
        ) {
          if (isInteractiveElement(e.target)) {
            return;
          }
        }
      }

      if (timer.current !== undefined) clearTimeout(timer.current);

      timer.current = window.setTimeout(
        () => setControls((prev) => ({ ...prev, visible: false })),
        Duration.inMilliseconds(hideAfter),
      );

      setControls((prev) => ({ ...prev, visible: true }));
    },
    [playback, hideAfter, setControls],
  );

  /* ------------------------- subscriptions ------------------------- */
  useEventListener(globalThis.document?.body, "keydown", resetTimer, {
    enabled: isActive,
  });
  useEventListener(globalThis.document?.body, "touchstart", resetTimer, {
    enabled: isActive,
  });
  useEventListener(globalThis.document?.body, "mousemove", resetTimer, {
    enabled: isActive,
  });
  useEventListener(globalThis.document?.body, "mouseleave", resetTimer, {
    enabled: isActive,
  });

  usePlaybackEvent("play", resetTimer, { enabled: isActive });
  usePlaybackEvent(
    "pause",
    () => {
      clearTimeout(timer.current);
      setControls((prev) => ({ ...prev, visible: true }));
    },
    { enabled: isActive },
  );
  usePlaybackEvent(
    "stop",
    () => {
      clearTimeout(timer.current);
      setControls((prev) => ({ ...prev, visible: true }));
    },
    { enabled: isActive },
  );

  useEffect(() => {
    if (!isActive) return;

    setControls((prev) => ({ ...prev, mounted: true, visible: true }));

    return () => {
      setControls((prev) => ({ ...prev, mounted: false, visible: false }));
    };
  }, [setControls, isActive]);

  if (!isActive) return null;

  return (
    <div className={clsx("lv-controls", className)} {...props}>
      {children}
    </div>
  );
}
