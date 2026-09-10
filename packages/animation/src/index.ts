import { Duration, type DurationLike } from "@liqvid/duration";
import { assertType, clamp, lerp, type ReplayData } from "@liqvid/utils";
import { default as BezierEasing, type EasingFunction } from "bezier-easing";

export type CommonEasingName = keyof typeof easings;

export interface AnimateOptions<
  T extends DurationLike | number | string = number,
> {
  /** Duration of animation. */
  duration: T;

  /** Easing function. Defaults to the identity function, i.e. linear easing. */
  easing?: CommonEasingName | EasingFunction;

  /**
   * End value for animation.
   * @default 1
   */
  endValue?: number;

  /** Start time for animation. */
  startTime: T;
  /**
   * Start value for animation.
   * @default 0
   */
  startValue?: number;
}

/**
 * Returns a function that takes in a time and returns a numeric value.
 * The function will return `startValue` whenever t is less than `startTime`, and similarly
 * will return `endValue` whenever t is greater than `startTime + duration`.
 *
 * You can use any time unit (seconds, milliseconds, days, …), as long as you
 * are consistent: `startTime`, `duration`, and the time parameter `t` must all
 * use the same units.
 *
 * If an array is passed, the functions are combined.
 */
export function animate(
  options: AnimateOptions<number> | AnimateOptions<number>[],
): (t: number) => number {
  if (Array.isArray(options)) {
    options.sort((a, b) => a.startTime - b.startTime);
    const fns = options.map(animate);

    return (t: number): number => {
      let i = 0;
      for (; i < fns.length; ++i) {
        if (options[i]!.startTime > t) {
          if (i === 0) return options[0]!.startValue ?? 0;

          return fns[i - 1]!(t);
        }
      }
      return fns[options.length - 1]!(t);
    };
  }

  const {
    startValue = 0,
    endValue = 1,
    startTime,
    duration,
    easing = (x: number) => x,
  } = options;

  const effectiveEasing =
    typeof easing === "string"
      ? BezierEasing(
          ...(easings[easing] as readonly [number, number, number, number]),
        )
      : easing;

  return (t: number) =>
    lerp(
      startValue,
      endValue,
      effectiveEasing(clamp(0, (t - startTime) / duration, 1)),
    );
}

/**
 * {@link Duration} equivalent of {@link animate}.
 */
export function animate$(
  options: AnimateOptions<DurationLike> | AnimateOptions<DurationLike>[],
): (t: Duration) => number {
  if (Array.isArray(options)) {
    // parse Durations
    options = options.map<AnimateOptions<Duration>>((opt) => ({
      ...opt,
      duration: Duration.from(opt.duration),
      startTime: Duration.from(opt.startTime),
    }));
    assertType<AnimateOptions<Duration>[]>(options);

    // sort
    options.sort((a, b) => a.startTime.minus(b.startTime).inMilliseconds());

    const fns = options.map(animate$);

    return (t: Duration): number => {
      assertType<AnimateOptions<Duration>[]>(options);
      let i = 0;
      for (; i < fns.length; ++i) {
        if (options[i]!.startTime.greaterThan(t)) {
          if (i === 0) return options[0]!.startValue ?? 0;

          return fns[i - 1]!(t);
        }
      }
      return fns[options.length - 1]!(t);
    };
  }

  const {
    startValue = 0,
    endValue = 1,
    startTime,
    duration,
    easing = (x: number) => x,
  } = options;

  const effectiveEasing =
    typeof easing === "string"
      ? BezierEasing(
          ...(easings[easing] as readonly [number, number, number, number]),
        )
      : easing;

  return (t: Duration) =>
    lerp(
      startValue,
      endValue,
      effectiveEasing(clamp(0, t.minus(startTime).dividedBy(duration), 1)),
    );
}

/** Cubic Bezier curve function */
export const bezier = BezierEasing;

export type { EasingFunction } from "bezier-easing";

/** Parameters for common Bezier curves. */
export const easings = {
  easeInBack: [0.6, -0.28, 0.735, 0.045],
  easeInCirc: [0.6, 0.04, 0.98, 0.335],
  easeInCubic: [0.55, 0.055, 0.675, 0.19],
  easeInExpo: [0.95, 0.05, 0.795, 0.035],
  easeInOutBack: [0.68, -0.55, 0.265, 1.55],
  easeInOutCirc: [0.785, 0.135, 0.15, 0.86],
  easeInOutCubic: [0.645, 0.045, 0.355, 1],
  easeInOutExpo: [1, 0, 0, 1],
  easeInOutQuad: [0.455, 0.03, 0.515, 0.955],
  easeInOutQuart: [0.77, 0, 0.175, 1],
  easeInOutQuint: [0.86, 0, 0.07, 1],
  easeInOutSine: [0.445, 0.05, 0.55, 0.95],
  easeInQuad: [0.55, 0.085, 0.68, 0.53],
  easeInQuart: [0.895, 0.03, 0.685, 0.22],
  easeInQuint: [0.755, 0.05, 0.855, 0.06],
  easeInSine: [0.47, 0, 0.745, 0.715],
  easeOutBack: [0.175, 0.885, 0.32, 1.275],
  easeOutCirc: [0.075, 0.82, 0.165, 1],
  easeOutCubic: [0.215, 0.61, 0.355, 1],
  easeOutExpo: [0.19, 1, 0.22, 1],
  easeOutQuad: [0.25, 0.46, 0.45, 0.94],
  easeOutQuart: [0.165, 0.84, 0.44, 1],
  easeOutQuint: [0.23, 1, 0.32, 1],
  easeOutSine: [0.39, 0.575, 0.565, 1],
} as const;

/**
 * Returns a function that takes in a time (in milliseconds) and returns the "active" replay datum. Useful for writing replay plugins.
 */
export function replay<K>({
  data,
  start,
  end,
  active,
  inactive,
  compressed,
  units = 1,
}: {
  /** Recording data to iterate through. */
  data: ReplayData<K>;

  /**
   * Start time.
   * @default 0
   */
  start?: number;

  /** End time. If not specified, defaults to `start` + total duration of `data`. */
  end?: number;

  /**
   * If true, times are interpreted as relative. Otherwise, they are interpreted as absolute times.
   *
   * In a future release, this will likely default to `true`.
   * @default false
   */
  compressed?: boolean;

  /** Callback receiving active value and index of active value. */
  active: (current: K, index: number) => void;

  /** Callback called when replay is inactive. Doesn't get called repeatedly. */
  inactive: () => void;

  /**
   * Scaling factor to convert time units to milliseconds. This affects {@link start},
   * {@link end}, and the parameter of the returned function. When {@link compressed}
   * is true, durations in {@link ReplayData} are **always** assumed to be in milliseconds.
   * When {@link compressed} is false, this option has no effect.
   *
   * For example, if you wanted to measure time in seconds, you would pass 1000.
   * @default 1
   * @since 1.8.0
   */
  units?: number;
}): (t: number) => void {
  if (typeof compressed === "undefined") compressed = false;
  if (typeof start === "undefined") start = 0;

  const times = data.map(compressed ? (d) => d[0] / units : (d) => d[0]);
  if (compressed) {
    for (let i = 1; i < times.length; ++i) {
      times[i]! += times[i - 1]!;
    }
  }

  if (typeof end === "undefined") end = start + times[times.length - 1]!;

  let lastTime = 0,
    i = 0,
    isActive = true;

  function listener(t: number) {
    // don't call inactive() repeatedly
    if (t < start! || t >= end!) {
      if (isActive) {
        isActive = false;
        return inactive();
      }
      return;
    }
    isActive = true;

    if (t < lastTime) i = 0;
    lastTime = t;

    let maxI = Math.min(i, times.length - 1);

    for (; i < times.length; i++) {
      if (start! + times[i]! < t) maxI = i;
      else break;
    }

    const [, current] = data[maxI]!;

    active(current, maxI);
  }

  return listener;
}
