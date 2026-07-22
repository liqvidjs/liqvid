"use client";

import { usePlayback, usePlaybackEvent, useTime } from "@liqvid/playback/react";
import { formatTime, formatTimeDuration, useForceUpdate } from "@liqvid/utils";
import { useRef } from "react";

export function TimeDisplay({
  classNames,
  ...props
}: {
  /** class names for individual children */
  classNames?: {
    /** class name for the current time element */
    current?: string;

    /** class name for the time separator (slash) */
    separator?: string;

    /** class name for the total duration */
    total?: string;
  };
} & React.ComponentProps<"span">) {
  const playback = usePlayback();
  const forceUpdate = useForceUpdate();

  usePlaybackEvent("durationchange", forceUpdate);

  useTime(() => {
    const timeElt = timeRef.current;
    if (!timeElt) return;

    timeElt.setAttribute("datetime", formatTimeDuration(playback.currentTime$));
    timeElt.innerText = formatTime(playback.currentTime$);
  });

  const timeRef = useRef<HTMLTimeElement>(null);

  return (
    <span className="lv-controls-time" {...props}>
      <time
        className="lv-current-time"
        dateTime={formatTimeDuration(playback.currentTime$)}
        ref={timeRef}
      >
        {formatTime(playback.currentTime$)}
      </time>
      <span className="lv-time-separator">/</span>
      <time
        className="lv-total-time"
        dateTime={formatTimeDuration(playback.duration$)}
      >
        {formatTime(playback.duration$)}
      </time>
    </span>
  );
}
