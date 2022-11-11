import * as React from "react";
import {useCallback, useEffect, useRef, useState} from "react";

import {ScrubberBar, ThumbData} from "./controls/ScrubberBar";
import {useKeymap} from "@liqvid/keymap/react";
import {usePlayback} from "@liqvid/playback/react";
import {Player} from "./Player";

interface Props {
  controls: JSX.Element | JSX.Element[];
  thumbs?: ThumbData;
}

// hiding timeout
const TIMEOUT = 3000;

export default function Controls(props: Props) {
  const keymap = useKeymap();
  const playback = usePlayback();
  const [visible, setVisible] = useState(true);

  const timer = useRef(0);

  // reset the hiding timer
  const resetTimer = useCallback(() => {
    if (playback.paused) return;
    if (timer.current !== undefined) clearTimeout(timer.current);
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

  const classNames = ["rp-controls", "lv-controls"];
  if (!visible) classNames.push("hidden");

  return (
    <div className={classNames.join(" ")}>
      <ScrubberBar thumbs={props.thumbs} />
      <div className="lv-controls-buttons">
        {props.controls instanceof Array ? (
          <>
            {Player.defaultControlsLeft}

            <div className="lv-controls-right">
              {...props.controls}
              {Player.defaultControlsRight}
            </div>
          </>
        ) : (
          props.controls
        )}
      </div>
    </div>
  );
}
