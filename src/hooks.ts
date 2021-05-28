import {useContext, useEffect} from "react";
import Player from "./Player";

export function useMarkerUpdate(callback: (prevIndex: number) => void, deps?: React.DependencyList) {
  const {script} = useContext(Player.Context);

  useEffect(() => {
    script.on("markerupdate", callback);

    return () => {
      script.off("markerupdate", callback);
    };
  }, deps);  
}

export function usePlayer() {
  return useContext(Player.Context);
}

export function useTimeUpdate(callback: (t: number) => void, deps?: React.DependencyList) {
  const {playback} = useContext(Player.Context);

  useEffect(() => {
    playback.on("seek", callback);
    playback.on("timeupdate", callback);

    return () => {
      playback.off("seek", callback);
      playback.off("timeupdate", callback);
    };
  }, deps);
}
