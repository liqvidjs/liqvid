import {useKeymap} from "@liqvid/keymap/react";
import {usePlayback} from "@liqvid/playback/react";
import {onClick, useForceUpdate} from "@liqvid/utils/react";
import * as React from "react";
import {useEffect, useMemo} from "react";
import {strings} from "../i18n";

/** Control for playing/pausing */
export function PlayPause() {
  const keymap = useKeymap();
  const playback = usePlayback();
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    // subscribe to events
    const events = ["pause", "play", "seeking", "seeked", "stop"] as const;

    for (const e of events) playback.on(e, forceUpdate);

    // keyboard controls
    const toggle = () => playback[playback.paused ? "play" : "pause"]();
    keymap.bind("K", toggle);
    keymap.bind("Space", toggle);

    return () => {
      // unbind playback listeners
      for (const e of events) playback.off(e, forceUpdate);

      // unbind keyboard controls
      keymap.unbind("K", toggle);
      keymap.unbind("Space", toggle);
    };
  }, []);

  // event handler
  const events = useMemo(
    () => onClick(() => (playback.paused ? playback.play() : playback.pause())),
    []
  );
  const label =
    (playback.paused || playback.seeking ? strings.PLAY : strings.PAUSE) +
    " (k)";

  return (
    <button
      className="lv-controls-playpause"
      aria-label={label}
      title={label}
      {...events}
    >
      <svg viewBox="0 0 36 36">
        {playback.paused || playback.seeking ? playIcon : pauseIcon}
      </svg>
    </button>
  );
}

/** Play icon */
const playIcon = (
  <path
    d="M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z"
    fill="white"
  />
);

/** Pause icon */
const pauseIcon = (
  <path d="M 12 26 h 4 v -16 h -4 z M 21 26 h 4 v -16 h -4 z" fill="white" />
);
