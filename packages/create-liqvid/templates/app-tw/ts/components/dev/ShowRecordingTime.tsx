import { useRecordingApi } from "@liqvid/recording";
import {
  formatTime,
  formatTimeDuration,
  useForceUpdate,
  useStableDuration,
} from "@liqvid/utils";
import { type DurationLike, useEventListener } from "liqvid";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

/**
 * Displays how long you've been recording for. You can specify a maximum length to target,
 * e.g. you want your videos to come in under 5 minutes, and it will warn you when you approach
 * or exceed this maximum length.
 */
export const ShowRecordingTime = dynamic(async () => {
  if (process.env.NODE_ENV === "production") {
    return {
      default: () => null,
    };
  }

  return {
    default: function ShowRecordingTime({
      max,
      threshold = 0.9,
    }: {
      /**
       * Maximum duration to target. Control will turn red when this duration is exceeded.
       */
      max?: DurationLike;

      /**
       * Percentage of maximum at which to warn. Control will turn yellow when this percentage of the maximum duration is exceeded.
       * @default 0.9
       */
      threshold?: number;
    }) {
      const { manager } = useRecordingApi();
      const $max = useStableDuration(max);
      const ref = useRef<HTMLTimeElement>(null);

      // subscribe to manager updates
      const forceUpdate = useForceUpdate();

      useEventListener(manager, "start", forceUpdate);
      useEventListener(manager, "pause", forceUpdate);
      useEventListener(manager, "resume", forceUpdate);

      // update display
      useEffect(() => {
        function update() {
          // checks
          if (!manager.active || manager.paused) return;
          const span = ref.current;
          if (!span) return;

          // get time as Duration
          const $time = manager.getTime$();

          // update display
          span.textContent = formatTime($time);

          // duration warnings
          if ($max) {
            if ($time.greaterThanOrEqual($max)) {
              span.style.backgroundColor = "red";
            } else if ($time.greaterThanOrEqual($max.times(threshold))) {
              span.style.backgroundColor = "#bb0";
            } else {
              span.style.backgroundColor = "darkgreen";
            }
          }

          // next update
          requestAnimationFrame(update);
        }

        // initial call
        requestAnimationFrame(update);
      }, [manager.paused, manager.active, $max, threshold, manager.getTime$]);

      // hide when recording is inactive
      if (!manager.active) return null;

      // render
      return (
        <time
          className={twMerge(
            "inline-flex h-full select-text items-center bg-[darkgreen] px-[.5em] align-top font-sans",
          )}
          dateTime={formatTimeDuration(manager.getTime$())}
          key="show-recording-time"
          ref={ref}
        >
          {formatTime(manager.getTime$())}
        </time>
      );
    },
  };
});
