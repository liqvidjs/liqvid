"use client";

import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import { useForceUpdate } from "@liqvid/utils";
import clsx from "clsx";
import { useCallback } from "react";

import { convertShortcuts } from "./utils";

/** Control for playing/pausing */
export function PlayPause({
  className,
  render,
  shortcuts,
}: {
  className?: string;
  render: (
    state: {
      paused: boolean;
      seeking: boolean;
    },
    props: React.ButtonHTMLAttributes<HTMLButtonElement>,
  ) => React.ReactNode;
  shortcuts?: string[];
}) {
  const playback = usePlayback();
  const forceUpdate = useForceUpdate();

  usePlaybackEvent("pause", forceUpdate);
  usePlaybackEvent("play", forceUpdate);
  usePlaybackEvent("seeked", forceUpdate);
  usePlaybackEvent("seeking", forceUpdate);
  usePlaybackEvent("stop", forceUpdate);

  // keyboard controls
  const toggle = useCallback(() => {
    return playback[playback.paused ? "play" : "pause"]();
  }, [playback]);

  useKeyboardShortcut(shortcuts, toggle);

  return render(
    { paused: playback.paused, seeking: playback.seeking },
    {
      "aria-keyshortcuts": convertShortcuts(shortcuts),
      className: clsx("lv-controls-playpause lv-controls-button", className),
      onClick: toggle,
    },
  );
}
