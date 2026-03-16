"use client";

import { useKeymap } from "@liqvid/keymap/react";
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
  const keymap = useKeymap();
  const playback = usePlayback();
  const forceUpdate = useForceUpdate();

  usePlaybackEvent("pause", forceUpdate);
  usePlaybackEvent("play", forceUpdate);
  usePlaybackEvent("seeked", forceUpdate);
  usePlaybackEvent("seeking", forceUpdate);
  usePlaybackEvent("stop", forceUpdate);

  // keyboard controls
  const toggle = useCallback(
    () => playback[playback.paused ? "play" : "pause"](),
    [playback],
  );

  useEffect(() => {
    // keyboard shortcut
    for (const seq of shortcuts ?? []) {
      keymap.bind(seq, toggle);
    }

    return () => {
      // unbind keyboard controls
      for (const seq of shortcuts ?? []) {
        keymap.unbind(seq, toggle);
      }
    };
  }, [keymap, shortcuts, toggle]);

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
      ...events,
    },
  );
}
