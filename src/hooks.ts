import {useContext, useEffect} from "react";
import Player from "./Player";

export function useMarkerUpdate(callback: (prevIndex: number) => void, deps?: React.DependencyList) {
  const script = useScript();

  useEffect(() => {
    script.on("markerupdate", callback);

    return () => {
      script.off("markerupdate", callback);
    };
  }, deps);  
}

export function useKeyMap() {
  return usePlayer().keymap;
}

export function usePlayback() {
  return usePlayer().playback;
}

export function useScript() {
  return usePlayer().script;
}

export function usePlayer() {
  return useContext(Player.Context);
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
