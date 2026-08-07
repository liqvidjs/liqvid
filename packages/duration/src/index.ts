import type { SerializedValue } from "@liqvid/ssr";

const SECONDS = 1000,
  MINUTES = 60 * SECONDS,
  HOURS = 60 * MINUTES,
  DAYS = 24 * HOURS,
  WEEKS = 7 * DAYS;

const serializationKey = "@liqvid/duration";

/**
 * Convenience type representing either a {@link Duration}
 * or creation options for one
 */
export type DurationLike = Duration | DurationOptions;

/**
 * Object for creating or specifying Durations.
 * These are additive, e.g. passing `{seconds: 20, minutes: 5}` is
 * equivalent to passing `{seconds: 320}`.
 */
export type DurationOptions = {
  /** shortcut for days */
  readonly d?: number;
  readonly days?: number;

  /** shortcut for hours */
  readonly h?: number;
  readonly hours?: number;

  /** shortcut for milliseconds */
  readonly ms?: number;
  readonly milliseconds?: number;

  /** shortcut for minutes */
  readonly m?: number;
  readonly minutes?: number;

  /** shortcut for seconds */
  readonly s?: number;
  readonly seconds?: number;

  /** shortcut for weeks */
  readonly w?: number;
  readonly weeks?: number;
};

export type SerializedDuration = DurationOptions &
  SerializedValue<typeof serializationKey>;

export interface DurationSetter {
  add(other: DurationOptions): void;
  set(options: DurationOptions): void;
  setMilliseconds(ms: number): void;
  setSeconds(s: number): void;
  setToZero(): void;
  subtract(other: DurationOptions): void;
}

/**
 * Interval between two points in time, agnostic of units.
 */
export class Duration {
  protected __valueMs: number;

  constructor(opts: DurationOptions = {}) {
    this.__valueMs = Duration.inMilliseconds(opts);
  }

  static betweenDates(start: Date, end: Date): Duration {
    return new Duration({ milliseconds: end.getTime() - start.getTime() });
  }

  /**
   * Coerce a DurationLike or Date into a Duration
   */
  static from(val: DurationLike | Date): Duration {
    if (val instanceof Date)
      return new Duration({ milliseconds: val.getTime() });
    if (val instanceof Duration) return val;
    return new Duration(val);
  }

  /**
   * Hydrate a Duration value
   */
  static fromJSON(val: SerializedDuration): Duration {
    return Duration.from(val);
  }

  /** convert a DurationLike to milliseconds without creating unnecessary Duration objects */
  static inMilliseconds(val: DurationLike = {}): number {
    if (val instanceof Duration) return val.inMilliseconds();

    const {
      milliseconds = 0,
      ms = 0,
      seconds = 0,
      s = 0,
      minutes = 0,
      m = 0,
      hours = 0,
      h = 0,
      days = 0,
      d = 0,
      weeks = 0,
      w = 0,
    } = val;

    return (
      (weeks + w) * WEEKS +
      (days + d) * DAYS +
      (hours + h) * HOURS +
      (minutes + m) * MINUTES +
      (seconds + s) * SECONDS +
      (milliseconds + ms)
    );
  }

  /** convert a DurationLike to seconds without creating unnecessary Duration objects */
  static inSeconds(val: DurationLike): number {
    return Duration.inMilliseconds(val) / 1000;
  }

  /**
   * Create a new {@link Duration} object and receive a callback
   * to imperatively set its value. You can use this instead of
   * a {@link MutableDuration} when you don't want the value to
   * be mutable to consumers.
   */
  static withSetter(options?: DurationOptions): [Duration, DurationSetter] {
    const dur = new Duration(options);

    return [
      dur,
      {
        add(other: DurationOptions) {
          dur.__valueMs += Duration.inMilliseconds(other);
        },
        set(other: DurationOptions) {
          dur.__valueMs = Duration.inMilliseconds(other);
        },
        setMilliseconds(ms: number) {
          dur.__valueMs = ms;
        },
        setSeconds(ms: number) {
          dur.__valueMs = ms;
        },
        setToZero() {
          dur.__valueMs = 0;
        },
        subtract(other: DurationOptions) {
          dur.__valueMs -= Duration.inMilliseconds(other);
        },
      },
    ];
  }

  /** referentially stable empty duration */
  static zero = new Duration();

  /* ------------------------- serialization ------------------------- */
  toJSON(): SerializedDuration {
    return { __deser: serializationKey, ms: this.__valueMs };
  }

  /* ------------------------- extractors ------------------------- */
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

  /* ------------------------- comparison ------------------------- */
  /** whether `lower <= this < upper` */
  between(lower: DurationLike, upper: DurationLike): boolean {
    return this.greaterThanOrEqual(lower) && this.lessThan(upper);
  }

  /** compare two Durations */
  equals(
    /** duration to compare this one to */
    other: DurationLike,
  ): boolean {
    return this.__valueMs === Duration.inMilliseconds(other);
  }

  greaterThan(other: DurationLike): boolean {
    return !this.lessThanOrEqual(other);
  }

  greaterThanOrEqual(other: DurationLike): boolean {
    return !this.lessThan(other);
  }

  lessThan(other: DurationLike): boolean {
    return this.__valueMs < Duration.inMilliseconds(other);
  }

  lessThanOrEqual(other: DurationLike): boolean {
    return this.__valueMs <= Duration.inMilliseconds(other);
  }

  /* ------------------------- arithmetic ------------------------- */
  dividedBy(other: DurationLike): number {
    return this.__valueMs / Duration.inMilliseconds(other);
  }

  minus(other: DurationLike): Duration {
    return new Duration({
      milliseconds: this.__valueMs - Duration.inMilliseconds(other),
    });
  }

  plus(other: Date): Date;
  plus(other: DurationLike): Duration;
  plus(other: DurationLike | Date): Duration | Date {
    if (other instanceof Date) {
      return new Date(other.getTime() + this.__valueMs);
    }

    return new Duration({
      milliseconds: this.__valueMs + Duration.inMilliseconds(other),
    });
  }

  times(factor: number): Duration {
    return new Duration({ milliseconds: this.__valueMs * factor });
  }
}

/**
 * Duration with options to imperatively set the inner value.
 * This is mostly for frequently-changing values where we want
 * to avoid the cost of allocating lots of new objects; in most situations,
 * it should be fine to just use a new Duration.
 */
export class MutableDuration extends Duration implements DurationSetter {
  /* ------------------------------ setter methods ------------------------------ */
  add(other: DurationLike) {
    this.__valueMs = this.__valueMs + Duration.inMilliseconds(other);
  }

  subtract(other: DurationLike) {
    this.__valueMs = this.__valueMs - Duration.inMilliseconds(other);
  }

  set(opts: DurationOptions = {}) {
    this.__valueMs = Duration.inMilliseconds(opts);
  }

  setMilliseconds(ms: number) {
    this.__valueMs = ms;
  }

  setSeconds(s: number) {
    this.__valueMs = s * 1000;
  }

  setToZero() {
    this.__valueMs = 0;
  }
}
