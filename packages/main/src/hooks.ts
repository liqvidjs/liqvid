import {usePlayback} from "@liqvid/playback/react";
import {useContext, useEffect} from "react";

export {KeymapContext, useKeymap} from "@liqvid/keymap/react";
export {PlaybackContext, usePlayback, useTime} from "@liqvid/playback/react";

import {Player} from "./Player";
import type {Script} from "./script";

/** Access the ambient {@link Player} */
export function usePlayer(): Player {
  return useContext(Player.Context);
}

/** Register a callback for when the marker changes */
export function useMarkerUpdate(
  callback: (prevIndex: number) => void,
  deps?: React.DependencyList,
): void {
  const script = useScript();

  useEffect(() => {
    script.on("markerupdate", callback);

    return () => {
      script.off("markerupdate", callback);
    };
  }, [callback, script, ...deps]);
}

/** Access the ambient {@link Script} */
export function useScript<M extends string = string>(): Script<M> {
  return usePlayer().script as Script<M>;
}

/** Register a callback for when the time changes */
export function useTimeUpdate(
  callback: (t: number) => void,
  deps?: React.DependencyList,
): void {
  const playback = usePlayback();

  useEffect(() => {
    playback.on("seek", callback);
    playback.on("timeupdate", callback);

    return () => {
      playback.off("seek", callback);
      playback.off("timeupdate", callback);
    };
  }, [callback, playback, ...deps]);
}
