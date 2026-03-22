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
 * These are additive, e.g. passing `{seconds: 20, minutes: 5}` is
 * equivalent to passing `{seconds: 320}`.
 */
export type DurationOptions = {
  /** shortcut for days */
  d?: number;
  days?: number;

  /** shortcut for hours */
  h?: number;
  hours?: number;

  /** shortcut for milliseconds */
  ms?: number;
  milliseconds?: number;

  /** shortcut for minutes */
  m?: number;
  minutes?: number;

  /** shortcut for seconds */
  s?: number;
  seconds?: number;

  /** shortcut for weeks */
  w?: number;
  weeks?: number;
};

export type SerializedDuration = DurationOptions &
  SerializedValue<typeof serializationKey>;

export interface DurationSetter {
  add(other: DurationOptions): void;
  subtract(other: DurationOptions): void;
  set(options: DurationOptions): void;
  setMilliseconds(ms: number): void;
  setSeconds(s: number): void;
  setToZero(): void;
}

/**
 * Interval between two points in time, agnostic of units.
 */
export class Duration {
  protected __valueMs: number;

  constructor({
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
  }: DurationOptions = {}) {
    this.__valueMs =
      (weeks + w) * WEEKS +
      (days + d) * DAYS +
      (hours + h) * HOURS +
      (minutes + m) * MINUTES +
      (seconds + s) * SECONDS +
      (milliseconds + ms);
  }

  /**
   * Coerce a DurationLike into a Duration
   */
  static from(val: DurationLike): Duration {
    if (val instanceof Duration) return val;
    return new Duration(val);
  }

  /**
   * Hydrate a Duration value
   */
  static fromJSON(val: SerializedDuration): Duration {
    return Duration.from(val);
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
          dur.__valueMs += Duration.from(other).__valueMs;
        },
        set({
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
        }: DurationOptions) {
          dur.__valueMs =
            (weeks + w) * WEEKS +
            (days + d) * DAYS +
            (hours + h) * HOURS +
            (minutes + m) * MINUTES +
            (seconds + s) * SECONDS +
            (milliseconds + ms);
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
          dur.__valueMs -= Duration.from(other).__valueMs;
        },
      },
    ];
  }

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

  /* ------------------------- arithmetic ------------------------- */
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

/**
 * Duration with options to imperatively set the inner value.
 * This is mostly for frequently-changing values where we want
 * to avoid the cost of allocating lots of new objects; in most situations,
 * it should be fine to just use a new Duration.
 */
export class MutableDuration extends Duration implements DurationSetter {
  /* ------------------------------ setter methods ------------------------------ */
  add(other: DurationLike) {
    other = Duration.from(other);
    this.__valueMs = this.__valueMs + other.inMilliseconds();
  }

  subtract(other: DurationLike) {
    other = Duration.from(other);
    this.__valueMs = this.__valueMs - other.inMilliseconds();
  }

  set({
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
  }: DurationOptions = {}) {
    this.__valueMs =
      (weeks + w) * WEEKS +
      (days + d) * DAYS +
      (hours + h) * HOURS +
      (minutes + m) * MINUTES +
      (seconds + s) * SECONDS +
      (milliseconds + ms);
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
