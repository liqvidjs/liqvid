import {formatTime} from "@liqvid/utils/time";
import * as React from "react";
import {useEffect} from "react";
import {usePlayback} from "../hooks";
import {useForceUpdate} from "@liqvid/utils/react";

export function TimeDisplay() {
  const playback = usePlayback();
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    playback.on("durationchange", forceUpdate);
    playback.on("seek", forceUpdate);
    playback.on("timeupdate", forceUpdate);

    return () => {
      playback.off("durationchange", forceUpdate);
      playback.off("seek", forceUpdate);
      playback.off("timeupdate", forceUpdate);
    };
  }, []);

  return (
    <span className="lv-controls-time">
      <span className="lv-current-time">{formatTime(playback.currentTime)}</span>
      <span className="lv-time-separator">/</span>
      <span className="lv-total-time">{formatTime(playback.duration)}</span>
    </span>
  );
}
