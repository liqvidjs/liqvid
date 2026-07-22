"use client";

import { parseTime$, timeRegexp } from "@liqvid/utils";
import { usePlayback, usePlayer, useScriptOptional } from "liqvid";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/**
 * If ?t=(...) is specified in the URL, seek to that point in the video
 * on page load. Both marker names and times like "3:45" are supported.
 */
export function useSeekFromSearch() {
  const playback = usePlayback();
  const script = useScriptOptional();
  const t = useSearchParams().get("t");

  const { renderingTasks } = usePlayer();

  const hasVisibleRenderingTasks = useMemo(
    () => Array.from(renderingTasks).filter((task) => task.visible).length > 0,
    [renderingTasks],
  );

  const [didSeek, setDidSeek] = useState(false);

  useEffect(() => {
    if (!t) return;
    if (hasVisibleRenderingTasks) return;

    if (didSeek) return;

    const marker = script?.markers.get(t);
    if (marker) {
      playback.currentTime$ = marker.start;
    } else {
      if (t.match(timeRegexp)) {
        playback.currentTime$ = parseTime$(t);
      }
    }

    setDidSeek(true);
  }, [didSeek, hasVisibleRenderingTasks, playback, script, t]);
}
