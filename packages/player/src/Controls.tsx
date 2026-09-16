"use client";

import { Duration, type DurationLike } from "@liqvid/duration";
import { useEventListener } from "@liqvid/event-emitter/react";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import clsx from "clsx";
import { useCallback, useEffect, useRef } from "react";

import { usePlayer } from "./hooks.ts";
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
  const { renderMode } = usePlayer();
  const { setControls } = usePrivatePlayerApi();

  const playback = usePlayback();

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
  useEventListener(globalThis.document?.body, "keydown", resetTimer);

  useEventListener(globalThis.document?.body, "touchstart", resetTimer);
  useEventListener(globalThis.document?.body, "mousemove", resetTimer);
  useEventListener(globalThis.document?.body, "mouseleave", resetTimer);

  usePlaybackEvent("play", resetTimer);
  usePlaybackEvent("pause", () => {
    clearTimeout(timer.current);
    setControls((prev) => ({ ...prev, visible: true }));
  });
  usePlaybackEvent("stop", () => {
    clearTimeout(timer.current);
    setControls((prev) => ({ ...prev, visible: true }));
  });

  useEffect(() => {
    if (renderMode !== "web") return;

    setControls((prev) => ({ ...prev, mounted: true, visible: true }));

    return () => {
      setControls((prev) => ({ ...prev, mounted: false, visible: false }));
    };
  }, [setControls, renderMode]);

  if (renderMode !== "web") return;

  return (
    <div className={clsx("lv-controls", className)} {...props}>
      {children}
    </div>
  );
}
