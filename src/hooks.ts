import {usePlayback} from "@liqvid/playback/react";
import {useContext, useEffect} from "react";
import {Player} from "./Player";

export {useKeymap} from "@liqvid/keymap/react";
export {usePlayback, useTime} from "@liqvid/playback/react";

/** Access the ambient {@link Player} */
export function usePlayer() {
  return useContext(Player.Context);
}

export function useMarkerUpdate(callback: (prevIndex: number) => void, deps?: React.DependencyList) {
  const script = useScript();

  useEffect(() => {
    script.on("markerupdate", callback);

    return () => {
      script.off("markerupdate", callback);
    };
  }, deps);
}

/** Access the ambient {@link Script} */
export function useScript() {
  return usePlayer().script;
}

export function useTimeUpdate(callback: (t: number) => void, deps?: React.DependencyList) {
  const playback = usePlayback();

  useEffect(() => {
    playback.on("seek", callback);
    playback.on("timeupdate", callback);

    return () => {
      playback.off("seek", callback);
      playback.off("timeupdate", callback);
    };
  }, deps);
}
