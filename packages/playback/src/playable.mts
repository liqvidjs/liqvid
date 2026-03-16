export type PlayableEventMap = Pick<
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

export interface Playable
  extends Pick<
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
  > {
  addEventListener<K extends keyof PlayableEventMap, T extends this>(
    type: K,
    listener: (event: { target: T; type: K }) => unknown,
  ): void;
  removeEventListener<K extends keyof PlayableEventMap, T extends this>(
    type: K,
    listener: (event: { target: T; type: K }) => unknown,
  ): void;
}
