import {useContext, useEffect, useReducer} from "react";
import {Player} from "liqvid";

export function usePlayer() {
  return useContext(Player.Context);
}

export function useKeymap() {
  return usePlayer().keymap;
}

export function usePlayback() {
  return usePlayer().playback;
}

/**
 * Register a callback for time update. Returns the current time.
 */
export function useTime(callback: (t: number) => void, deps?: React.DependencyList) {
  const {playback} = useContext(Player.Context);

  useEffect(() => {
    playback.hub.on("seek", callback);
    playback.hub.on("timeupdate", callback);
    callback(playback.currentTime);

    return () => {
      playback.hub.off("seek", callback);
      playback.hub.off("timeupdate", callback);
    };
  }, deps);

  return playback.currentTime;
}

export function combineRefs<T>(...args: React.Ref<T>[]) {
  return (o: T) => {
    for (const ref of args) {
      if (typeof ref === "function") {
        ref(o);
      } else if (ref === null) {
      } else if (typeof ref === "object" && ref.hasOwnProperty("current")) {
        (ref as React.MutableRefObject<T>).current = o;
      }
    }
  };
}

export function useForceUpdate() {
  return useReducer((c: boolean) => !c, false)[1];
}
