import { Duration, type DurationLike } from "@liqvid/duration";
import { usePlayback, useTime$ } from "@liqvid/playback/react";
import { useScript } from "@liqvid/script/react";
import { useMemo } from "react";

const EPSILON = new Duration({ milliseconds: 50 });

/**
 * Pause the video at a certain time.
 */
export function usePauseAt<M extends string>(
  at: DurationLike | M,
  {
    enabled = true,
    epsilon = EPSILON,
  }: {
    enabled?: boolean | (() => boolean);
    epsilon?: DurationLike;
  } = {},
) {
  const playback = usePlayback();
  const script = useScript();

  const $at = useMemo(() => {
    if (typeof at === "string") {
      return script.markers.get(at).start;
    }
    return Duration.from(at);
  }, [at, script.markers.get]);

  useTime$((t, prev) => {
    if (typeof enabled === "function") {
      enabled = enabled();
    }

    if (
      prev.between($at.minus(epsilon), $at) &&
      t.between($at, $at.plus(epsilon)) &&
      enabled
    ) {
      playback.pause();
    }
  });
}
