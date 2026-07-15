export type SeekableElementEventMap = Pick<
  HTMLMediaElementEventMap,
  | "durationchange"
  | "ended"
  | "pause"
  | "play"
  | "playing"
  | "ratechange"
  | "readystatechange"
  | "seeked"
  | "seeking"
  | "timeupdate"
  | "volumechange"
>;

export type Seekable = Pick<
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
  addEventListener<K extends keyof SeekableElementEventMap>(
    type: K,
    listener: () => unknown,
  ): void;
  removeEventListener<K extends keyof SeekableElementEventMap>(
    type: K,
    listener: () => unknown,
  ): void;
};
