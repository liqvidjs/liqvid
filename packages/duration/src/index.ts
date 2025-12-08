const SECONDS = 1000,
  MINUTES = 60 * SECONDS,
  HOURS = 60 * MINUTES,
  DAYS = 24 * HOURS,
  WEEKS = 7 * DAYS;

/**
 * Convenience type representing either a {@link Duration}
 * or creation options for one
 */
export type DurationLike = Duration | DurationOptions;

/**
 * These are additive, e.g. passing `{seconds: 20, minutes: 5}` is
 * equivalent to passing `{seconds: 320}`.
 */
export interface DurationOptions {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
  weeks?: number;
}

/**
 * Interval between two points in time, agnostic of units.
 */
export class Duration {
  private __valueMs: number;

  constructor({
    milliseconds = 0,
    seconds = 0,
    minutes = 0,
    hours = 0,
    days = 0,
    weeks = 0,
  }: DurationOptions = {}) {
    this.__valueMs =
      weeks * WEEKS +
      days * DAYS +
      hours * HOURS +
      minutes * MINUTES +
      seconds * SECONDS +
      milliseconds;
  }

  /**
   * Coerce a DurationLike into a Duration
   */
  static from(val: DurationLike): Duration {
    if (val instanceof Duration) return val;
    return new Duration(val);
  }

  /**
   * Create a new {@link Duration} object and receive a callback
   * to imperatively set its value. This is useful when you need
   * to keep a {@link Duration} object in sync with some changing
   * value (e.g. wrapping `currentTime` on a `<video>` element),
   * and want to avoid allocating lots of new objects. Keeping the
   * setter separate ensures that consumers of your wrapped value
   * cannot change it.
   */
  static withSetter(
    options?: DurationOptions,
  ): [Duration, { setMilliseconds: (ms: number) => void }] {
    const d = new Duration(options);
    const setMilliseconds = (ms: number) => {
      d.__valueMs = ms;
    };
    return [d, { setMilliseconds }];
  }

  /* extractors */
  inDays(): number {
    return this.__valueMs / DAYS;
  }

  inHours(): number {
    return this.__valueMs / HOURS;
  }

  inMilliseconds(): number {
    return this.__valueMs;
  }

  inMinutes(): number {
    return this.__valueMs / MINUTES;
  }

  inSeconds(): number {
    return this.__valueMs / SECONDS;
  }

  inWeeks(): number {
    return this.__valueMs / WEEKS;
  }

  /* comparison */
  /** lower <= this < upper */
  between(lower: DurationLike, upper: DurationLike): boolean {
    return this.greaterThanOrEqual(lower) && this.lessThan(upper);
  }

  equals(other: DurationLike): boolean {
    other = Duration.from(other);
    return this.__valueMs === other.__valueMs;
  }

  greaterThan(other: DurationLike): boolean {
    return !this.lessThanOrEqual(other);
  }

  greaterThanOrEqual(other: DurationLike): boolean {
    return !this.lessThan(other);
  }

  lessThan(other: DurationLike): boolean {
    other = Duration.from(other);
    return this.__valueMs < other.__valueMs;
  }

  lessThanOrEqual(other: DurationLike): boolean {
    other = Duration.from(other);
    return this.__valueMs <= other.__valueMs;
  }

  /* arithmetic */
  dividedBy(other: DurationLike): number {
    other = Duration.from(other);
    return this.__valueMs / other.__valueMs;
  }

  minus(other: DurationLike): Duration {
    other = Duration.from(other);
    return new Duration({
      milliseconds: this.__valueMs - other.__valueMs,
    });
  }

  plus(other: DurationLike): Duration {
    other = Duration.from(other);
    return new Duration({
      milliseconds: this.__valueMs + other.__valueMs,
    });
  }

  times(factor: number): Duration {
    return new Duration({ milliseconds: this.__valueMs * factor });
  }
}
