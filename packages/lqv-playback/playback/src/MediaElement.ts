export type MediaElementEventMap = Pick<
  HTMLMediaElementEventMap,
  | "durationchange"
  | "ended"
  | "pause"
  | "play"
  | "playing"
  | "ratechange"
  | "seeked"
  | "seeking"
  | "timeupdate"
  | "volumechange"
>;

export type MediaElement = Pick<
  HTMLMediaElement,
  | "currentTime"
  | "duration"
  | "muted"
  | "pause"
  | "paused"
  | "play"
  | "playbackRate"
  | "seeking"
  | "volume"
> & {
  addEventListener<K extends keyof MediaElementEventMap>(
    type: K,
    listener: () => unknown,
  ): void;
  removeEventListener<K extends keyof MediaElementEventMap>(
    type: K,
    listener: () => unknown,
  ): void;
};
