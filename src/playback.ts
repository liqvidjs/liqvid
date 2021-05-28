import {EventEmitter} from "events";
import type StrictEventEmitter from "strict-event-emitter-types";
import {bind, constrain} from "./utils/misc";
import {parseTime} from "./utils/time";

interface PlaybackEvents {
  "bufferupdate": void;
  "cuechange": void;
  "durationchange": void;
  "pause": void;
  "play": void;
  "seek": number;
  "seeked": void;
  "seeking": void;
  "stop": void;
  "ratechange": void;
  "timeupdate": number;
  "volumechange": void;
}

interface PlaybackOptions {
  duration: number;
}

declare let webkitAudioContext: typeof AudioContext;

/* handle playback progress */
export default class Playback
  extends (EventEmitter as new () => StrictEventEmitter<EventEmitter, PlaybackEvents>)
{
  audioContext: AudioContext;
  audioNode:    GainNode;
  /**
    The current playback time in milliseconds.
    Warning: the HTMLMediaElement interface measures this property in seconds.
  */
  currentTime:  number;

  paused:       boolean;

  private playingFrom:  number;
  private startTime:    number;

  private __captions:     DocumentFragment[];
  private __duration:     number;
  private __playbackRate: number;
  private __muted:        boolean;
  private __seeking:      boolean;
  private __volume:       number;
  
  constructor(options: PlaybackOptions) {
    super();
    Object.assign(this, {
      currentTime: 0,
      duration: options.duration,
      playbackRate: 1,
      playingFrom: 0,
      startTime: performance.now(),

      __captions: [],

      // HTMLMediaElement properties
      __muted: false,
      __playbackRate: 1,
      paused: true,
      __seeking: false,
      __volume: 1
    });

    // audio
    this.audioContext = new (window.AudioContext || webkitAudioContext)();
    this.audioNode = this.audioContext.createGain();
    this.audioNode.connect(this.audioContext.destination);

    // hub will have lots of listeners, turn off warning
    this.setMaxListeners(0);

    bind(this, ["pause", "play", "__advance"]);

    // initiate playback loop
    requestAnimationFrame(this.__advance);
  }

  get hub() {
    return this;
  }

  /* magic properties */
  get captions() {
    return this.__captions;
  }

  set captions(captions) {
    this.__captions = captions;

    this.emit("cuechange");
  }

  /**
    The length of the playback in milliseconds.
    Warning: the HTMLMediaElement interface measures this property in seconds.
  */
  get duration() {
    return this.__duration;
  }

  set duration(duration) {
    if (duration === this.__duration)
      return;

    this.__duration = duration;

    this.emit("durationchange");
  }

  get muted() {
    return this.__muted;
  }

  set muted(val) {
    if (val === this.__muted)
      return;

    this.__muted = val;

    if (this.__muted) {
      this.audioNode.gain.value = 0;
    } else {
      this.audioNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    }

    this.emit("volumechange");
  }

  get playbackRate() {
    return this.__playbackRate;
  }

  set playbackRate(val) {
    if (val === this.__playbackRate)
      return;

    this.__playbackRate = val;
    this.playingFrom = this.currentTime;
    this.startTime = performance.now();
    this.emit("ratechange");
  }

  get seeking(): boolean {
    return this.__seeking;
  }

  set seeking(val) {
    if (val === this.__seeking)
      return;

    this.__seeking = val;
    if (this.__seeking) this.emit("seeking");
    else this.emit("seeked");
  }

  /** Pause playback. */
  pause() {
    this.paused = true;
    this.playingFrom = this.currentTime;

    this.emit("pause");
  }

  /** Resume playback. */
  play() {
    this.paused = false;
    this.emit("play");
  }

  /** Seek playback to a specific time. */
  seek(t: number | string) {
    if (typeof t === "string")
      t = parseTime(t);
    t = constrain(0, t, this.duration);

    this.currentTime = this.playingFrom = t;
    this.startTime = performance.now();

    this.emit("seek", t);
  }

  get volume() {
    return this.__volume;
  }

  set volume(volume: number) {
    this.muted = false;
    const prevVolume = this.__volume;
    this.__volume = constrain(0, volume, 1);

    if (prevVolume === 0 || this.__volume === 0) {
      this.audioNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    } else {
      this.audioNode.gain.exponentialRampToValueAtTime(this.__volume, this.audioContext.currentTime + 2);
    }

    this.emit("volumechange");
  }

  stop() {
    this.paused = true;
    this.playingFrom = 0;

    this.emit("stop");
  }

  /* private methods */
  __advance(t: number) {
    // paused
    if (this.paused || this.__seeking) {
      this.startTime = t;
    } else {
    // playing
      this.currentTime = this.playingFrom + Math.max((t - this.startTime) * this.__playbackRate, 0);

      if (this.currentTime >= this.duration) {
        this.currentTime = this.duration;
        this.stop();
      }

      this.emit("timeupdate", this.currentTime);
    }

    requestAnimationFrame(this.__advance);
  }
}
