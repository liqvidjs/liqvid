import { Duration, type DurationLike } from "@liqvid/duration";
import { IS_CLIENT } from "@liqvid/ssr";

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

interface CommittedAnimation {
  delay: number;
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  options: number | KeyframeEffectOptions | undefined;
  target: Element;
}

const supportsCommitStyles =
  typeof Animation !== "undefined" &&
  typeof Animation.prototype.commitStyles === "function";

/** Extended {@link CorePlayback Playback} supporting rich durations and the Web Animation API */
export class Playback extends CorePlayback {
  private __animations: Animation[] = [];
  private __committed: CommittedAnimation[] = [];
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

    if (IS_CLIENT) {
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

  set duration$(d: DurationLike) {
    this.duration = Duration.inSeconds(d);
  }

  /**
   * Create an {@link Animation} (factory) synced to this playback
   * @param keyframes A [keyframes object](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats) or `null`
   * @param options Either an integer representing the animation's duration, or {@link KeyframeEffectOptions}
   * @returns A callback to attach the animation to a target
   */
  newAnimation<T extends Element>(
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options?:
      | DurationLike
      | (KeyframeEffectOptions & { duration: DurationLike }),
  ): (target: T | null) => Animation | undefined {
    let anim: Animation | undefined;

    return (target: T | null) => {
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

      anim = this.__adoptAnimation(target, keyframes, options);
      return anim;
    };
  }

  /**
   * Internal method to create and adopt an animation
   */
  private __adoptAnimation(
    target: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options?:
      | DurationLike
      | (KeyframeEffectOptions & {
          delay?: DurationLike;
          duration: DurationLike;
        }),
  ): Animation | undefined {
    let transformedOptions: number | undefined | KeyframeEffectOptions;

    if (options) {
      if ("duration" in options) {
        transformedOptions = {
          ...options,
          delay: Duration.inMilliseconds(options.delay),
          duration: Duration.inMilliseconds(options.duration),
        };
      } else {
        transformedOptions = Duration.inMilliseconds(options);
      }
    }

    // create animation
    const anim = new Animation(
      new KeyframeEffect(target, keyframes, transformedOptions),
      this.timeline,
    );

    const shouldFill =
      typeof options === "object" &&
      "duration" in options &&
      (options.fill === "forwards" || options.fill === "both");

    if (shouldFill && supportsCommitStyles) {
      // Use commitStyles when animation finishes, then cancel
      anim.addEventListener("finish", () => {
        try {
          anim.commitStyles();
          this.__committed.push({
            delay: typeof options === "object" ? (options.delay ?? 0) : 0,
            keyframes,
            options,
            target,
          });
          anim.cancel();
        } catch {
          // commitStyles can fail if element is not rendered; fall back to persist
          anim.persist();
        }
      });
    } else if (shouldFill) {
      anim.persist();
    }

    /* adopt animation */
    if (!anim.effect) return;

    const delay = anim.effect.getTiming().delay;
    if (delay === undefined) return;
    this.__delays.set(anim.effect, delay);

    anim.currentTime =
      (this.currentTime$.inMilliseconds() - delay) / this.playbackRate;
    anim.startTime = null;
    anim.pause();

    if (delay !== 0) {
      anim.effect.updateTiming({ delay: 0.1 });
    }

    this.__animations.push(anim);
    anim.addEventListener("cancel", () => {
      const idx = this.__animations.indexOf(anim);
      if (idx !== -1) {
        this.__animations.splice(idx, 1);
      }
    });

    // return
    return anim;
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
          (this.__delays.get(anim.effect)! -
            this.currentTime$.inMilliseconds()) /
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
    this.addEventListener("seeked", () => {
      const currentTimeMs = this.currentTime$.inMilliseconds();

      // Recreate committed animations when rewound past their start
      for (let i = this.__committed.length - 1; i >= 0; i--) {
        const { delay, keyframes, options, target } = this.__committed[i]!;
        if (currentTimeMs <= delay) {
          this.__committed.splice(i, 1);
          this.__adoptAnimation(target, keyframes, options);
        }
      }

      for (const anim of this.__animations) {
        const offset =
          (this.__delays.get(anim.effect!)! - currentTimeMs) /
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
