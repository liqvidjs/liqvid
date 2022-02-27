import * as React from "react";
import {useCallback, useEffect, useMemo, useRef} from "react";

import {useKeymap, usePlayback} from "../hooks";
import {strings} from "../i18n";
import {onClick} from "../utils/mobile";
import {useForceUpdate} from "../utils/react-utils";

/** Volume control */
export function Volume() {
  const keymap = useKeymap();
  const playback = usePlayback();
  const forceUpdate = useForceUpdate();

  // keyboard controls
  const incrementVolume = useCallback(() => playback.volume = playback.volume + 0.05, []);
  const decrementVolume = useCallback(() => playback.volume = playback.volume - 0.05, []);
  const toggleMute = useCallback(() => playback.muted = !playback.muted, []);

  /*
    Set up subscriptions.
    We don't do this in useEffect() because it needs to run
    before useEffect()s in the video content.
  */
  const subscribed = useRef(false);
  if (!subscribed.current) {
    playback.on("volumechange", forceUpdate);
    keymap.bind("ArrowUp", incrementVolume);
    keymap.bind("ArrowDown", decrementVolume);
    keymap.bind("M", toggleMute);
    subscribed.current = true;
  }

  useEffect(() => {
    // unsubscriptions
    return () => {
      playback.off("volumechange", forceUpdate);
      keymap.unbind("ArrowUp", incrementVolume);
      keymap.unbind("ArrowDown", decrementVolume);
      keymap.unbind("M", toggleMute);
    };
  }, []);

  // input
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    playback.volume = parseFloat(e.target.value) / 100;
  }, []);

  const events = useMemo(() => onClick(() => playback.muted = !playback.muted), []);
  const label = (playback.muted ? strings.UNMUTE : strings.MUTE) + " (m)";
  
  const volumeText = new Intl.NumberFormat(undefined, {style: "percent"}).format(playback.volume) + " volume";

  return (
    <div className="lv-controls-volume">
      <button aria-label={label} title={label}>
        <svg {...events} viewBox="0 0 100 100">
          {speakerIcon}
          {
            playback.muted ?
              mutedIcon
              :
              (
                <g>
                  {playback.volume > 0 && waveIcon1}
                  {playback.volume >= 0.5 && waveIcon2}
                </g>
              )
          }
        </svg>
      </button>
      <input
        aria-valuetext={volumeText}
        min="0"
        max="100"
        onChange={onChange}
        type="range"
        value={playback.muted ? 0 : playback.volume * 100}/>
    </div>
  );
}

const speakerIcon = <path d="M 10 35 h 20 l 25 -20 v 65 l -25 -20 h -20 z" fill="white" stroke="none"/>;
const mutedIcon = <path d="M 63 55 l 20 20 m 0 -20 l -20 20" stroke="white" strokeWidth="7"/>;
const waveIcon1 = <path d="M 62 32.5 a 1,1 0 0,1 0,30" fill="white" stroke="none"/>;
const waveIcon2 = <path d="M 62 15 a 1,1 0 0,1 0,65 v -10 a 10,10 0 0,0 0,-45 v -10 z" fill="white" stroke="none"/>;
