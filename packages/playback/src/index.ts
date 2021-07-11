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

interface PlaybackOptions {
  duration: number;
}

declare let webkitAudioContext: typeof AudioContext;

/* handle playback progress */
export class Playback
  extends (EventEmitter as new () => StrictEventEmitter<EventEmitter, PlaybackEvents>)
{
  audioContext: AudioContext;
  audioNode:    GainNode;
  /**
    The current playback time in milliseconds.
    Warning: the HTMLMediaElement interface measures this property in seconds.
  */
  currentTime = 0;

  paused = true;
  timeline = new DocumentTimeline();

  /* private fields */
  private __animations: Animation[] = [];
  private __delays = new WeakMap<AnimationEffect, number>();
  private __playingFrom:  number;
  private __startTime:    number;

  /* private fields exposed by getters */
  private __captions: DocumentFragment[] = [];
  private __duration: number;
  private __playbackRate = 1;
  private __muted = false;
  private __seeking = false;
  private __volume = 1;
  
  constructor(options: PlaybackOptions) {
    super();

    this.duration = options.duration;
    this.__playingFrom = 0;
    this.__startTime = performance.now();

    // audio
    this.audioContext = new (window.AudioContext || webkitAudioContext)();
    this.audioNode = this.audioContext.createGain();
    this.audioNode.connect(this.audioContext.destination);

    // hub will have lots of listeners, turn off warning
    this.setMaxListeners(0);

    // timeline
    this.__createTimeline();

    // bind
    bind(this, ["pause", "play"]);
    this.__advance = this.__advance.bind(this);

    // initiate playback loop
    requestAnimationFrame(this.__advance);
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
    this.__playingFrom = this.currentTime;
    this.__startTime = performance.now();
    this.emit("ratechange");
  }

  get seeking() {
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
    this.__playingFrom = this.currentTime;

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

    this.currentTime = this.__playingFrom = t;
    this.__startTime = performance.now();

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
    this.__playingFrom = 0;

    this.emit("stop");
  }

  /* animation stuff :S */
  newAnimation<T extends Element>(keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: number | KeyframeEffectOptions) {
    let anim: Animation;
    return (target: T) => {
      if (target === null) {
        anim.cancel();
        anim = undefined;
        return;
      } else if (anim !== undefined) {
        console.warn("Animations should not be reused as they will not cancel properly. Check animations attached to ", target);
      }

      // create animation
      anim = new Animation(new KeyframeEffect(target, keyframes, options), this.timeline);
      if (typeof options === "object" && (options.fill === "forwards" || options.fill === "both")) {
        anim.persist();
      }
      /* adopt animation */
      const delay = anim.effect.getTiming().delay;
      this.__delays.set(anim.effect, delay);

      anim.currentTime = (this.currentTime - delay) / this.playbackRate;
      anim.startTime = null;
      anim.pause();

      if (delay !== 0) {
        anim.effect.updateTiming({delay: 0.1});
      }

      this.__animations.push(anim);
      anim.addEventListener("cancel", () => {
        this.__animations.splice(this.__animations.indexOf(anim), 1);
      });

      // return
      return anim;
    };
  }

  /* private methods */
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
  Create our timeline
  */
  private __createTimeline() {
    this.timeline = new DocumentTimeline();

    // pause
    this.on("pause", () => {
      for (const anim of this.__animations) {
        anim.pause();
      }
    });

    // play
    this.on("play", () => {
      for (const anim of this.__animations) {
        anim.startTime = null;
        anim.play();
        anim.startTime =
          this.timeline.currentTime +
          (this.__delays.get(anim.effect) - this.currentTime) / this.playbackRate;
      }
    });

    // ratechange
    this.on("ratechange", () => {
      for (const anim of this.__animations) {
        anim.playbackRate = this.playbackRate;
      }
    });

    // seek
    this.on("seek", () => {
      for (const anim of this.__animations) {
        const offset = (this.__delays.get(anim.effect) - this.currentTime) / this.playbackRate;
        if (this.paused) {
          // anim.startTime = this.timeline.currentTime + offset
          anim.currentTime = -offset;
          anim.pause();
        } else {
          anim.startTime = this.timeline.currentTime + offset;
        }
      }
    });
  }
}
