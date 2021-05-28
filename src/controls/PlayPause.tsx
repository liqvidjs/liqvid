import * as React from "react";
import {useEffect, useMemo, useRef} from "react";

import {usePlayer} from "../hooks";
import {onClick} from "../utils/mobile";
import {useForceUpdate} from "../utils/react-utils";

export default function PlayPause() {
  const {keymap, playback} = usePlayer();
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    // subscribe to events
    const events = ["pause", "play", "seeking", "seeked", "stop"] as const;

    for (const e of events)
      playback.on(e, forceUpdate);

    // keyboard controls
    const toggle = () => playback[playback.paused ? "play" : "pause"]();
    keymap.bind("K", toggle);
    keymap.bind("Space", toggle);

    return () => {
      // unbind playback listeners
      for (const e of events)
        playback.off(e, forceUpdate);

      // unbind keyboard controls
      keymap.unbind("K", toggle);
      keymap.unbind("Space", toggle);
    };
  }, []);

  // event handler
  const button = useRef<SVGSVGElement>();
  const events = useMemo(
    () => onClick(() => playback.paused ? playback.play() : playback.pause(), button)
    , []);

  return (
    <svg className="rp-controls-playpause" viewBox="0 0 36 36" {...events}>
      {
        (playback.paused || playback.seeking) ?
          <path d="M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z" fill="white"/>
          :
          <path d="M 12 26 h 4 v -16 h -4 z M 21 26 h 4 v -16 h -4 z" fill="white"/>
      }
    </svg>
  );
}
