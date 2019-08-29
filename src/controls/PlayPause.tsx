import * as React from "react";
import {useCallback, useContext, useEffect, useState} from "react";

import Player from "../Player";

export default function PlayPause() {
  const {playback} = useContext(Player.Context);
  const [state, setState] = useState(playback.paused || playback.seeking);

  const update = () => setState(playback.paused || playback.seeking);

  useEffect(() => {
    const events = ["pause", "play", "seeked", "seeking", "seeked", "stop"];

    for (const e of events)
      playback.hub.on(e, update);

    return () => {
      for (const e of events)
        playback.hub.off(e, update);
    };
  }, []);

  const onClick = useCallback(() => playback.paused ? playback.play() : playback.pause(), []);

  return (
    <svg
      className="rp-controls-playpause"
      onClick={onClick}
      viewBox="0 0 36 36">
      {
        state ?
          <path d="M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z" fill="white"/>
          :
          <path d="M 12 26 h 4 v -16 h -4 z M 21 26 h 4 v -16 h -4 z" fill="white"/>
      }
    </svg>
  );
}
