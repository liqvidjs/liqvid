import {EventEmitter} from "events";
import type StrictEventEmitter from "strict-event-emitter-types";
import {bind, constrain} from "@liqvid/utils/misc";

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

declare let webkitAudioContext: typeof AudioContext;

/**
 * Class pretending to be a media element advancing in time.
 * 
 * Imitates {@link HTMLMediaElement} to a certain extent, although it does not implement that interface.
 */
export class Playback
  extends (EventEmitter as unknown as new () => StrictEventEmitter<EventEmitter, PlaybackEvents>)
{
  /** Audio context owned by this playback */
  audioContext: AudioContext;

  /** Audio node owned by this playback */
  audioNode: GainNode;

  /**
    The current playback time in milliseconds.
    
    **Warning:** {@link HTMLMediaElement.currentTime} measures this property in *seconds*.
  */
  currentTime = 0;

  /** Flag indicating whether playback is currently paused. */
  paused = true;

  /* private fields */
  private __playingFrom:  number;
  private __startTime:    number;

  /* private fields exposed by getters */
  private __captions: DocumentFragment[] = [];
  private __duration: number;
  private __playbackRate = 1;
  private __muted = false;
  private __seeking = false;
  private __volume = 1;
  
  constructor(options: {
    /** Duration of the playback in milliseconds */
    duration: number;
  }) {
    super();

    this.duration = options.duration;
    this.__playingFrom = 0;
    this.__startTime = performance.now();

    // audio
    this.__initAudio();

    // we will have lots of listeners, turn off warning
    this.setMaxListeners(0);

    // bind
    bind(this, ["pause", "play"]);
    this.__advance = this.__advance.bind(this);

    // initiate playback loop
    requestAnimationFrame(this.__advance);
  }
  
  /* magic properties */

  /** Gets or sets the current captions */
  get captions() {
    return this.__captions;
  }

  /** @emits cuechange */
  set captions(captions) {
    this.__captions = captions;

    this.emit("cuechange");
  }

  /**
    * Length of the playback in milliseconds.
    * 
    * **Warning:** {@link HTMLMediaElement.duration} measures this in *seconds*.
  */
  get duration() {
    return this.__duration;
  }

  /** @emits durationchange */
  set duration(duration) {
    if (duration === this.__duration)
      return;

    this.__duration = duration;
    
    this.emit("durationchange");
  }

  /** Gets or sets a flag that indicates whether playback is muted. */
  get muted() {
    return this.__muted;
  }

  /** @emits volumechange */
  set muted(val) {
    if (val === this.__muted)
      return;

    this.__muted = val;

    if (this.audioNode) {
      if (this.__muted) {
        this.audioNode.gain.value = 0;
      } else {
        this.audioNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
      }
    }
    
    this.emit("volumechange");
  }

  /** Gets or sets the current rate of speed for the playback. */
  get playbackRate() {
    return this.__playbackRate;
  }

  /** @emits ratechange */
  set playbackRate(val) {
    if (val === this.__playbackRate)
      return;

    this.__playbackRate = val;
    this.__playingFrom = this.currentTime;
    this.__startTime = performance.now();
    this.emit("ratechange");
  }

  /** Gets or sets a flag that indicates whether the playback is currently moving to a new position. */
  get seeking() {
    return this.__seeking;
  }

  /**
   * @emits seeking
   * @emits seeked
   */
  set seeking(val) {
    if (val === this.__seeking)
      return;

    this.__seeking = val;
    if (this.__seeking) this.emit("seeking");
    else this.emit("seeked");
  }

  /**
   * Pause playback.
   * 
   * @emits pause
   */
  pause() {
    this.paused = true;
    this.__playingFrom = this.currentTime;

    this.emit("pause");
  }

  /**
   * Start or resume playback.
   * 
   * @emits play
   */
  play() {
    this.paused = false;

    this.emit("play");
  }

  /**
   * Seek playback to a specific time.
   * 
   * @emits seek
   */
  seek(t: number) {
    t = constrain(0, t, this.duration);

    this.currentTime = this.__playingFrom = t;
    this.__startTime = performance.now();

    this.emit("seek", t);
  }

  /** Gets or sets the volume level for the playback. */
  get volume() {
    return this.__volume;
  }

  /** @emits volumechange */
  set volume(volume: number) {
    this.muted = false;
    const prevVolume = this.__volume;
    this.__volume = constrain(0, volume, 1);

    if (this.audioNode) {
      if (prevVolume === 0 || this.__volume === 0) {
        this.audioNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      } else {
        this.audioNode.gain.exponentialRampToValueAtTime(this.__volume, this.audioContext.currentTime + 2);
      }
    }

    this.emit("volumechange");
  }

  /**
   * Stop playback and reset pointer to start
   * 
   * @emits stop
   */
  stop() {
    this.paused = true;
    this.__playingFrom = 0;

    this.emit("stop");
  }

  /* private methods */
  
  /**
   * @emits timeupdate
   */
  private __advance(t: number) {
    // paused
    if (this.paused || this.__seeking) {
      this.__startTime = t;
    } else {
    // playing
      this.currentTime = this.__playingFrom + Math.max((t - this.__startTime) * this.__playbackRate, 0);

      if (this.currentTime >= this.duration) {
        this.currentTime = this.duration;
        this.stop();
      }

      this.emit("timeupdate", this.currentTime);
    }

    requestAnimationFrame(this.__advance);
  }

  /**
   * Try to initiate audio
   * 
   * @listens click
   * @listens keydown
   * @listens touchstart
   */
  private __initAudio() {
    const requestAudioContext = () => {
      try {
        this.audioContext = new (window.AudioContext || webkitAudioContext)();
        this.audioNode = this.audioContext.createGain();
        this.audioNode.connect(this.audioContext.destination);

        window.removeEventListener("click", requestAudioContext);
        window.removeEventListener("keydown", requestAudioContext);
        window.removeEventListener("touchstart", requestAudioContext);
      } catch (e) {
        // console.log("Failed to create audio context");
      }
    }
    window.addEventListener("click", requestAudioContext);
    window.addEventListener("keydown", requestAudioContext);
    window.addEventListener("touchstart", requestAudioContext);
  }
}
