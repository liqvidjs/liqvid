import type { Playback, PlaybackEvents } from ".";
import type { MediaElement, MediaElementEventMap } from "./MediaElement";

/** Hack to make Liqvid behave like {@link MediaElement}. */
export const PlaybackMEProxy: ProxyHandler<Playback> = {
  get(target, p) {
    switch (p) {
      case "currentTime":
        return target.currentTime / 1000;
      case "duration":
        return target.duration / 1000;
      case "addEventListener":
        return <K extends keyof MediaElementEventMap>(
          type: K,
          listener: () => unknown,
        ): void => {
          switch (type) {
            case "seeking":
              return target.on("seek", listener);
            default:
              return target.on(type as keyof PlaybackEvents, listener);
          }
        };
      case "removeEventListener":
        return <K extends keyof MediaElementEventMap>(
          type: K,
          listener: () => unknown,
        ): void => {
          switch (type) {
            case "seeking":
              return target.off("seek", listener);
            default:
              return target.off(type as keyof PlaybackEvents, listener);
          }
        };
      default:
        return target[p as keyof Playback];
    }
  },
  set<P extends keyof MediaElement & keyof Playback>(
    target: Playback,
    p: P,
    value: Playback[P],
  ) {
    switch (p) {
      case "currentTime":
        target.seek((value as number) * 1000);
        break;
      case "duration":
        target.duration = (value as number) * 1000;
        break;
      default:
        target[p] = value;
    }
    return true;
  },
  // this is important so that we don't Proxy our Proxy
  has(target, p) {
    switch (p) {
      case "currentTime":
      case "duration":
      case "muted":
      case "pause":
      case "paused":
      case "play":
      case "playbackRate":
      case "seeking":
      case "volume":
      case "addEventListener":
      case "removeEventListener":
        return true;
      default:
        return false;
    }
  },
};
