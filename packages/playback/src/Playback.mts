import { Duration, type DurationLike } from "@liqvid/duration";
import { IS_CLIENT } from "@liqvid/ssr";

import { CorePlayback, type PlaybackEvent } from "./synthetic-playback.mts";

declare global {
  interface Animation {
    /**
     * Explicitly persists an animation, when it would otherwise be removed due to the browser's
     * [Automatically removing filling animations](https://developer.mozilla.org/en-US/docs/Web/API/Animation#automatically_removing_filling_animations) behavior.
     */
    persist(): void;
  }
}

const supportsCommitStyles =
  typeof Animation !== "undefined" &&
  typeof Animation.prototype.commitStyles === "function";

interface CommittedAnimation {
  delay: number;
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  options: number | KeyframeEffectOptions | undefined;
  target: Element;
}

export type ReadyStateItem = {
  readyState: number;
};

export type BufferedRange = readonly [start: number, end: number];

export type BufferedItem = {
  buffered: readonly BufferedRange[];
};

type KeyframeEffectOptionsWithDurations = Omit<
  KeyframeEffectOptions,
  "delay" | "duration"
> & {
  delay?: DurationLike;
  duration: DurationLike;
};

/** Extended {@link CorePlayback Playback} supporting rich durations and the Web Animation API */
export class Playback extends CorePlayback {
  private readonly __animations: Animation[] = [];
  private readonly __committed: CommittedAnimation[] = [];
  private readonly __delays = new WeakMap<AnimationEffect, number>();

  private readonly __readyStateItems: Set<ReadyStateItem> = new Set();
  private readonly __bufferedItems: Set<BufferedItem> = new Set();

  private readonly __$currentTime: Duration;
  private readonly __$duration: Duration;

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
  get currentTime$(): Duration {
    return this.__$currentTime;
  }

  set currentTime$(d: DurationLike) {
    this.currentTime = Duration.inSeconds(d);
  }

  get duration$(): Duration {
    return this.__$duration;
  }

  set duration$(d: DurationLike) {
    this.duration = Duration.inSeconds(d);
  }

  registerReadyStateItem(item: ReadyStateItem): void {
    const readyState = this.readyState;
    this.__readyStateItems.add(item);

    if (item.readyState < readyState) {
      this.__emit("readystatechange");
    }
  }

  updateReadyStateItem(item: ReadyStateItem, newReadyState: number): void {
    const prevReadyState = this.readyState;
    item.readyState = newReadyState;

    if (this.readyState !== prevReadyState) {
      this.__emit("readystatechange");
    }
  }

  unregisterReadyStateItem(item: ReadyStateItem): void {
    const prev = this.readyState;
    this.__readyStateItems.delete(item);

    if (this.readyState !== prev) {
      this.__emit("readystatechange");
    }
  }

  registerBufferedItem(item: BufferedItem): void {
    const previous = this.__getBufferedRanges();
    this.__bufferedItems.add(item);

    if (!sameRanges(previous, this.__getBufferedRanges())) {
      this.__emit("bufferupdate");
    }
  }

  updateBufferedItem(
    item: BufferedItem,
    newBuffered: readonly BufferedRange[],
  ): void {
    const previous = this.__getBufferedRanges();
    item.buffered = normalizeRanges(newBuffered);

    if (!sameRanges(previous, this.__getBufferedRanges())) {
      this.__emit("bufferupdate");
    }
  }

  unregisterBufferedItem(item: BufferedItem): void {
    const previous = this.__getBufferedRanges();
    this.__bufferedItems.delete(item);

    if (!sameRanges(previous, this.__getBufferedRanges())) {
      this.__emit("bufferupdate");
    }
  }

  /**
   * Create an {@link Animation} (factory) synced to this playback
   * @param keyframes A [keyframes object](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats) or `null`
   * @param options Either an integer representing the animation's duration, or {@link KeyframeEffectOptions}
   * @returns A callback to attach the animation to a target
   */
  newAnimation<T extends Element>(
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options?: DurationLike | KeyframeEffectOptionsWithDurations,
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

      anim = this.__adoptAnimation(
        target,
        keyframes,
        transformOptions(options),
      );
      return anim;
    };
  }

  /** Returns a unsigned short (enumeration) indicating the readiness state of the media. */
  get readyState(): number {
    return Array.from(this.__readyStateItems).reduce(
      (acc, curr) => Math.min(acc, curr.readyState),
      CorePlayback.HAVE_ENOUGH_DATA,
    );
  }

  /** Buffered playback-time ranges shared by all registered media sources. */
  get buffered(): TimeRanges {
    return createTimeRanges(this.__getBufferedRanges());
  }

  private __getBufferedRanges(): BufferedRange[] {
    const items = Array.from(this.__bufferedItems, ({ buffered }) =>
      normalizeRanges(buffered),
    );
    if (items.length === 0) return [];

    return items.slice(1).reduce(intersectRanges, items[0]!);
  }

  protected override __emit(eventName: PlaybackEvent) {
    // EventEmitter still treats subclass event targets as CorePlayback.
    // @ts-expect-error Playback's target is narrower than CorePlayback's map.
    this.emit(eventName, { target: this, type: eventName });
  }

  /* ------------------------------ private methods ------------------------------ */

  /**
   * Internal method to create and adopt an animation
   */
  private __adoptAnimation(
    target: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options?: number | KeyframeEffectOptions,
  ): Animation | undefined {
    // create animation
    const anim = new Animation(
      new KeyframeEffect(target, keyframes, options),
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

function createTimeRanges(ranges: readonly BufferedRange[]): TimeRanges {
  return {
    end(index: number) {
      const range = ranges[index];
      if (!range) throw new RangeError("Time range index is out of bounds");
      return range[1];
    },
    get length() {
      return ranges.length;
    },
    start(index: number) {
      const range = ranges[index];
      if (!range) throw new RangeError("Time range index is out of bounds");
      return range[0];
    },
  };
}

function normalizeRanges(ranges: readonly BufferedRange[]): BufferedRange[] {
  const sorted = ranges
    .filter(
      ([start, end]) =>
        Number.isFinite(start) && Number.isFinite(end) && end > start,
    )
    .map(([start, end]) => [start, end] as const)
    .sort(([startA], [startB]) => startA - startB);
  const normalized: BufferedRange[] = [];

  for (const [start, end] of sorted) {
    const previous = normalized.at(-1);
    if (!previous || start > previous[1]) {
      normalized.push([start, end]);
    } else if (end > previous[1]) {
      normalized[normalized.length - 1] = [previous[0], end];
    }
  }

  return normalized;
}

function intersectRanges(
  left: readonly BufferedRange[],
  right: readonly BufferedRange[],
): BufferedRange[] {
  const intersection: BufferedRange[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    const leftRange = left[leftIndex]!;
    const rightRange = right[rightIndex]!;
    const start = Math.max(leftRange[0], rightRange[0]);
    const end = Math.min(leftRange[1], rightRange[1]);
    if (end > start) intersection.push([start, end]);

    if (leftRange[1] < rightRange[1]) leftIndex++;
    else rightIndex++;
  }

  return normalizeRanges(intersection);
}

function sameRanges(
  left: readonly BufferedRange[],
  right: readonly BufferedRange[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      ([start, end], index) =>
        start === right[index]?.[0] && end === right[index]?.[1],
    )
  );
}

function transformOptions(options: DurationLike): number;
function transformOptions(
  options: KeyframeEffectOptionsWithDurations,
): KeyframeEffectOptions;
function transformOptions(options: undefined): undefined;

function transformOptions(
  options: DurationLike | KeyframeEffectOptionsWithDurations | undefined,
): number | KeyframeEffectOptions | undefined;

function transformOptions(
  options: DurationLike | KeyframeEffectOptionsWithDurations | undefined,
): number | KeyframeEffectOptions | undefined {
  if (!options) return options;

  if ("duration" in options) {
    return {
      ...options,
      delay: options.delay ? Duration.inMilliseconds(options.delay) : 0,
      duration: Duration.inMilliseconds(options.duration),
    };
  }

  return Duration.inMilliseconds(options);
}
