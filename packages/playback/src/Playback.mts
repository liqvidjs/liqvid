import { Duration } from "@liqvid/duration";
import { isClient } from "@liqvid/ssr";

import { CorePlayback } from "./synthetic-playback.mts";

declare global {
  interface Animation {
    /**
     * Explicitly persists an animation, when it would otherwise be removed due to the browser's
     * [Automatically removing filling animations](https://developer.mozilla.org/en-US/docs/Web/API/Animation#automatically_removing_filling_animations) behavior.
     */
    persist(): void;
  }
}

/** Extended {@link CorePlayback Playback} supporting rich durations and the Web Animation API */
export class Playback extends CorePlayback {
  private __animations: Animation[] = [];
  private __delays = new WeakMap<AnimationEffect, number>();

  private __$currentTime: Duration;
  private __$duration: Duration;

  /** {@link DocumentTimeline} synced up to this playback */
  timeline: DocumentTimeline | undefined;

  constructor() {
    super();

    // duration Duration
    {
      const [d, { setMilliseconds }] = Duration.withSetter();
      this.__$currentTime = d;
      this.addEventListener("timeupdate", () => {
        setMilliseconds(this.currentTime * 1000);
      });
    }
    {
      const [d, { setMilliseconds }] = Duration.withSetter();
      this.__$duration = d;
      this.addEventListener("durationchange", () => {
        setMilliseconds(this.duration * 1000);
      });
    }

    if (isClient) {
      this.__createTimeline();
    }
  }

  /** Get or set the current time as a {@link Duration} */
  get currentTime$() {
    return this.__$currentTime;
  }

  set currentTime$(d: Duration) {
    this.currentTime = d.inSeconds();
  }

  get duration$() {
    return this.__$duration;
  }

  set duration$(d: Duration) {
    this.duration = d.inSeconds();
  }

  /**
   * Create an {@link Animation} (factory) synced to this playback
   * @param keyframes A [keyframes object](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats) or `null`
   * @param options Either an integer representing the animation's duration (in milliseconds), or {@link KeyframeEffectOptions}
   * @returns A callback to attach the animation to a target
   */
  newAnimation<T extends Element>(
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options?: number | KeyframeEffectOptions,
  ): (target: T) => Animation | undefined {
    let anim: Animation | undefined;

    return (target: T) => {
      if (target === null) {
        anim?.cancel();
        anim = undefined;
        return;
      } else if (anim !== undefined) {
        console.warn(
          "Animations should not be reused as they will not cancel properly. Check animations attached to ",
          target,
        );
      }

      // create animation
      anim = new Animation(
        new KeyframeEffect(target, keyframes, options),
        this.timeline,
      );
      if (
        typeof options === "object" &&
        (options.fill === "forwards" || options.fill === "both")
      ) {
        anim.persist();
      }
      /* adopt animation */
      if (!anim.effect) return;

      const delay = anim.effect.getTiming().delay;
      if (delay === undefined) return;
      this.__delays.set(anim.effect, delay);

      anim.currentTime = (this.currentTime - delay) / this.playbackRate;
      anim.startTime = null;
      anim.pause();

      if (delay !== 0) {
        anim.effect.updateTiming({ delay: 0.1 });
      }

      this.__animations.push(anim);
      anim.addEventListener("cancel", () => {
        if (!anim) return;
        this.__animations.splice(this.__animations.indexOf(anim), 1);
      });

      // return
      return anim;
    };
  }

  /**
   * Create our timeline
   *
   * @listens pause
   * @listens play
   * @listens ratechange
   * @listens seek
   */
  private __createTimeline(): void {
    // don't crash old browsers when not polyfilled
    if (typeof window.DocumentTimeline === "undefined") {
      return;
    }
    this.timeline = new DocumentTimeline();

    // pause
    this.addEventListener("pause", () => {
      for (const anim of this.__animations) {
        anim.pause();
      }
    });

    // play
    this.addEventListener("play", () => {
      for (const anim of this.__animations) {
        if (!anim.effect) continue;
        anim.startTime = null;
        anim.play();
        anim.startTime =
          (this.timeline!.currentTime as number) +
          (this.__delays.get(anim.effect)! - this.currentTime) /
            this.playbackRate;
      }
    });

    // ratechange
    this.addEventListener("ratechange", () => {
      for (const anim of this.__animations) {
        anim.playbackRate = this.playbackRate;
      }
    });

    // seek
    this.addEventListener("seek", () => {
      for (const anim of this.__animations) {
        const offset =
          (this.__delays.get(anim.effect!)! - this.currentTime) /
          this.playbackRate;
        if (this.paused) {
          // anim.startTime = this.timeline.currentTime + offset
          anim.currentTime = -offset;
          anim.pause();
        } else {
          anim.startTime = (this.timeline!.currentTime as number) + offset;
        }
      }
    });
  }
}
