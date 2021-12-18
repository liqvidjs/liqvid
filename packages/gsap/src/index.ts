import gsap from "gsap";
import {Playback, usePlayer} from "liqvid";

const sym = Symbol();

declare module "liqvid" {
  interface Playback {
    [sym]: gsap.core.Timeline;
  }
}

/**
 * Get a GSAP timeline synced with Liqvid playback.
 */
export function useTimeline() {
  const {playback} = usePlayer();
  if (!playback[sym]) {
    playback[sym] = syncTimeline(playback);
  }
  return playback[sym] as gsap.core.Timeline;
}

/**
 * Create a GSAP timeline and sync it with Liqvid playback.
 */
function syncTimeline(playback: Playback) {
  const tl = gsap.timeline({paused: true});

  playback.hub.on("play", () => tl.resume());
  playback.hub.on("pause", () => tl.pause())
  playback.hub.on("ratechange", () => tl.timeScale(playback.playbackRate));
  playback.hub.on("seek", () => tl.seek(playback.currentTime / 1000));

  return tl;
}
