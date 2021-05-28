import * as React from "react";

import {useForceUpdate} from "../utils/react-utils";
import {usePlayback} from "../hooks";
import {formatTime} from "../utils/time";

export default function TimeDisplay() {
  const playback = usePlayback();
  const forceUpdate = useForceUpdate();

  React.useEffect(() => {
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
    <span className="rp-controls-time">
      <span className="rp-current-time">{formatTime(playback.currentTime)}</span>
      <span className="rp-time-separator">/</span>
      <span className="rp-total-time">{formatTime(playback.duration)}</span>
    </span>
  );
}
