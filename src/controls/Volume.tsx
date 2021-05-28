import * as React from "react";
const {useCallback, useEffect, useMemo} = React;

import {usePlayer} from "../hooks";
import {onClick} from "../utils/mobile";
import {useForceUpdate} from "../utils/react-utils";

export default function Volume() {
  const {keymap, playback} = usePlayer();
  const forceUpdate = useForceUpdate();
  
  useEffect(() => {
    // bind to volume changes
    playback.on("volumechange", forceUpdate);

    // keyboard controls
    keymap.bind("ArrowUp", () => playback.volume = playback.volume + 0.05);
    keymap.bind("ArrowDown", () => playback.volume = playback.volume - 0.05);
    keymap.bind("M", () => playback.muted = !playback.muted);
  }, []);
  
  // input
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    playback.volume = parseFloat(e.target.value) / 100;
  }, []);

  const events = useMemo(() => onClick(() => playback.muted = !playback.muted), []);

  return (
    <div className="rp-controls-volume">
      <svg {...events} viewBox="0 0 100 100">
        <path d="M 10 35 h 20 l 25 -20 v 65 l -25 -20 h -20 z" fill="white" stroke="none"/>
        {
          playback.muted ?
            <path d="M 63 55 l 20 20 m 0 -20 l -20 20" stroke="white" strokeWidth="7"/>
            :
            (
              <g>
                {playback.volume > 0 && <path d="M 62 32.5 a 1,1 0 0,1 0,30" fill="white" stroke="none"/>}
                {playback.volume >= 0.5 && <path d="M 62 15 a 1,1 0 0,1 0,65 v -10 a 10,10 0 0,0 0,-45 v -10 z" fill="white" stroke="none"/>}
              </g>
            )
        }
      </svg>
      <input
        min="0"
        max="100"
        onChange={onChange}
        type="range"
        value={playback.muted ? 0 : playback.volume * 100}/>
    </div>
  );
}
