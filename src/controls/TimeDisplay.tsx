import * as React from "react";

import {useForceUpdate} from "../utils/react-utils";
import {usePlayer} from "../hooks";
import {formatTime} from "../utils/time";

export default function TimeDisplay() {
  const {playback} = usePlayer();
  const forceUpdate = useForceUpdate();

  React.useEffect(() => {
    playback.hub.on("durationchange", forceUpdate);
    playback.hub.on("seek", forceUpdate);
    playback.hub.on("timeupdate", forceUpdate);

    return () => {
      playback.hub.off("durationchange", forceUpdate);
      playback.hub.off("seek", forceUpdate);
      playback.hub.off("timeupdate", forceUpdate);
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
