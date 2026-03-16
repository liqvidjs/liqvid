"use client";

import { usePlayback, usePlaybackEvent, useTime } from "@liqvid/playback/react";
import { formatTime, useForceUpdate } from "@liqvid/utils";
import { useRef } from "react";

export function TimeDisplay() {
  const playback = usePlayback();
  const forceUpdate = useForceUpdate();

  usePlaybackEvent("durationchange", forceUpdate);
  usePlaybackEvent("seek", forceUpdate);

  useTime(() => {
    const timeElt = timeRef.current;
    if (!timeElt) return;
    timeElt.innerText = formatTime(playback.currentTime$);
  });

  const timeRef = useRef<HTMLTimeElement>(null);

  return (
    <span className="lv-controls-time">
      <time className="lv-current-time" ref={timeRef}>
        {formatTime(playback.currentTime$)}
      </time>
      <span className="lv-time-separator">/</span>
      <time className="lv-total-time">{formatTime(playback.duration$)}</time>
    </span>
  );
}
