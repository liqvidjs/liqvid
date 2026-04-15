"use client";

import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import { onClickReact, useForceUpdate } from "@liqvid/utils";
import classNames from "classnames";
import { useCallback, useEffect, useMemo } from "react";

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

  useEffect(() => {
    setTimeout(() => {
      console.log("cow");
    }, 100);
  });

  // keyboard controls
  const toggle = useCallback(() => {
    console.log("click");
    return playback[playback.paused ? "play" : "pause"]();
  }, [playback]);

  useKeyboardShortcut(shortcuts, toggle);

  // event handler
  const events = useMemo(() => onClickReact(toggle), [toggle]);

  return render(
    { paused: playback.paused, seeking: playback.seeking },
    {
      "aria-keyshortcuts": convertShortcuts(shortcuts),
      className: classNames(
        "lv-controls-playpause lv-controls-button",
        className,
      ),
      onClick: toggle,
      onTouchStart: (e) => console.log("touchstart", e),
      style: { backgroundColor: "red !important", fill: "blue" },
      ...events,
    },
  );
}
