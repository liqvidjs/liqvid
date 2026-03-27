"use client";

import { Duration, type DurationLike } from "@liqvid/duration";
import { useEventListener } from "@liqvid/event-emitter/react";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import classNames from "classnames";
import { type JSX, useCallback, useRef, useState } from "react";

import { isInteractiveElement } from "./utils";

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
  const playback = usePlayback();
  const [visible, setVisible] = useState(true);

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
        () => setVisible(false),
        Duration.from(hideAfter).inMilliseconds(),
      );

      setVisible(true);
    },
    [playback, hideAfter],
  );

  /* ------------------------- subscriptions ------------------------- */
  useEventListener(globalThis.document?.body, "keydown", resetTimer);

  useEventListener(globalThis.document?.body, "touchstart", resetTimer);
  useEventListener(globalThis.document?.body, "mousemove", resetTimer);
  useEventListener(globalThis.document?.body, "mouseleave", () => {
    if (playback.paused || !hideAfter) return;
    setVisible(false);
  });

  usePlaybackEvent("play", resetTimer);
  usePlaybackEvent("pause", () => {
    clearTimeout(timer.current);
    setVisible(true);
  });
  usePlaybackEvent("stop", () => {
    clearTimeout(timer.current);
    setVisible(true);
  });

  return (
    <div
      className={classNames(
        "lv-controls",
        visible || "lv-controls-hidden",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
