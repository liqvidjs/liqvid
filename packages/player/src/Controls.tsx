"use client";

import { Duration, type DurationLike } from "@liqvid/duration";
import { useEventListener } from "@liqvid/event-emitter/react";
import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import classNames from "classnames";
import { useCallback, useRef, useState } from "react";

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
  const resetTimer = useCallback(() => {
    if (playback.paused || !hideAfter) return;

    if (timer.current !== undefined) clearTimeout(timer.current);

    timer.current = window.setTimeout(
      () => setVisible(false),
      Duration.from(hideAfter).inMilliseconds(),
    );

    setVisible(true);
  }, [playback, hideAfter]);

  /* ------------------------- subscriptions ------------------------- */
  useKeyboardShortcut("*", resetTimer);

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
