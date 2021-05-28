import * as React from "react";
const {useCallback, useEffect, useRef, useState} = React;

import ScrubberBar, {ThumbData} from "./controls/ScrubberBar";
import {usePlayer} from "./hooks";

interface Props {
  controls: (() => JSX.Element)[];
  thumbs?: ThumbData;
}

// hiding timeout
const TIMEOUT = 3000;

export default function Controls(props: Props) {
  const player = usePlayer();
  const {keymap, playback} = player;
  const [visible, setVisible] = useState(true);

  const timer = useRef(0);

  // reset the hiding timer
  const resetTimer = useCallback(() => {
    if (playback.paused)
      return;
    if (timer.current !== undefined)
      clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), TIMEOUT);
    setVisible(true);
  }, []);

  // mount subscriptions
  useEffect(() => {
    // hide on keyboard input
    keymap.bind("*", resetTimer);

    // show/hiding
    document.body.addEventListener("touchstart", resetTimer);
    document.body.addEventListener("mousemove", resetTimer);
    playback.on("play", resetTimer);

    playback.on("pause", () => {
      clearTimeout(timer.current);
      setVisible(true);
    });

    playback.on("stop", () => {
      clearTimeout(timer.current);
      setVisible(true);
    });

    document.body.addEventListener("mouseleave", () => {
      if (playback.paused) return;
      setVisible(false);
    });
  }, []);

  const classNames = ["rp-controls"];
  if (!visible)
    classNames.push("hidden");

  return (
    <div className={classNames.join(" ")}>
      <ScrubberBar thumbs={props.thumbs}/>
      <div className="rp-controls-buttons">
        {...props.controls}
      </div>
    </div>
  );
}
