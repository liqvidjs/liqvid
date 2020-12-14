import {useContext, useEffect} from "react";
import Player from "./Player";

export function useMarkerUpdate(callback: (prevIndex: number) => void, deps?: React.DependencyList) {
  const {script} = useContext(Player.Context);

  useEffect(() => {
    script.hub.on("markerupdate", callback);

    return () => {
      script.hub.off("markerupdate", callback);
    };
  }, deps);  
}

export function usePlayer() {
  return useContext(Player.Context);
}

export function useTimeUpdate(callback: (t: number) => void, deps?: React.DependencyList) {
  const {playback} = useContext(Player.Context);

  useEffect(() => {
    playback.hub.on("seek", callback);
    playback.hub.on("timeupdate", callback);

    return () => {
      playback.hub.off("seek", callback);
      playback.hub.off("timeupdate", callback);
    };
  }, deps);
}
