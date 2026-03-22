export type { MediaElement, MediaElementEventMap } from "./MediaElement";

export interface PlaybackEvents {
  bufferupdate: [];
  cuechange: [];
  durationchange: [];
  pause: [];
  play: [];
  seek: [number];
  seeked: [];
  seeking: [];
  stop: [];
  ratechange: [];
  timeupdate: [number];
  volumechange: [];
}

/**
 * Class pretending to be a media element advancing in time.
 *
 * Imitates {@link HTMLMediaElement} to a certain extent, although it does not implement that interface.
 * @deprecated Use MediaElement instead.
 */
export interface Playback {
  /** Subscribe to events */
  on<K extends keyof PlaybackEvents>(
    name: K,
    cb: (...args: PlaybackEvents[K]) => void,
  ): void;

  /** Unsubscribe from events */
  off<K extends keyof PlaybackEvents>(
    name: K,
    cb: (...args: PlaybackEvents[K]) => void,
  ): void;

  /**
    The current playback time in milliseconds.
    
    **Warning:** {@link HTMLMediaElement.currentTime} measures this property in *seconds*.
  */
  currentTime: number;

  /** Flag indicating whether playback is currently paused. */
  paused: boolean;

  /**
   * Length of the playback in milliseconds.
   *
   * **Warning:** {@link HTMLMediaElement.duration} measures this in *seconds*.
   */
  get duration(): number;

  /** @emits durationchange */
  set duration(duration: number);

  /** Gets or sets a flag that indicates whether playback is muted. */
  get muted(): boolean;

  /** @emits volumechange */
  set muted(val: boolean);

  /** Gets or sets the current rate of speed for the playback. */
  get playbackRate(): number;

  /** @emits ratechange */
  set playbackRate(val: number);

  /** Gets or sets a flag that indicates whether the playback is currently moving to a new position. */
  get seeking(): boolean;
  /**
   * @emits seeking
   * @emits seeked
   */
  set seeking(val: boolean);

  /**
   * Pause playback.
   *
   * @emits pause
   */
  pause(): void;

  /**
   * Start or resume playback.
   *
   * @emits play
   */
  play(): void;

  /**
   * Seek playback to a specific time.
   *
   * @emits seek
   */
  seek(t: number): void;

  /** Gets or sets the volume level for the playback. */
  get volume(): number;
  /** @emits volumechange */
  set volume(volume: number);

  /**
   * Stop playback and reset pointer to start
   *
   * @emits stop
   */
  stop(): void;
}
