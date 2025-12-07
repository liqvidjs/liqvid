const SECONDS = 1000,
  MINUTES = 60 * SECONDS,
  HOURS = 60 * MINUTES,
  DAYS = 24 * HOURS,
  WEEKS = 7 * DAYS;

export type DurationLike = Duration | DurationOptions;

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
    if (!(other instanceof Duration)) {
      other = new Duration(other);
    }
    return this.__valueMs === other.__valueMs;
  }

  greaterThan(other: DurationLike): boolean {
    return !this.lessThanOrEqual(other);
  }

  greaterThanOrEqual(other: DurationLike): boolean {
    return !this.lessThan(other);
  }

  lessThan(other: DurationLike): boolean {
    if (!(other instanceof Duration)) {
      other = new Duration(other);
    }
    return this.__valueMs < other.__valueMs;
  }

  lessThanOrEqual(other: DurationLike): boolean {
    if (!(other instanceof Duration)) {
      other = new Duration(other);
    }
    return this.__valueMs <= other.__valueMs;
  }

  /* arithmetic */
  dividedBy(other: DurationLike): number {
    if (!(other instanceof Duration)) {
      other = new Duration(other);
    }
    return this.__valueMs / other.__valueMs;
  }

  minus(other: DurationLike): Duration {
    if (!(other instanceof Duration)) {
      other = new Duration(other);
    }

    return new Duration({
      milliseconds: this.__valueMs - other.__valueMs,
    });
  }

  plus(other: DurationLike): Duration {
    if (!(other instanceof Duration)) {
      other = new Duration(other);
    }

    return new Duration({
      milliseconds: this.__valueMs + other.__valueMs,
    });
  }

  times(factor: number): Duration {
    return new Duration({ milliseconds: this.__valueMs * factor });
  }

  /* setters */

  /** Imperatively set this Duration from milliseconds. Mainly used to avoid the cost of creating a new object. */
  setMilliseconds(ms: number): void {
    this.__valueMs = ms;
  }

  /** Imperatively set this Duration from seconds. Mainly used to avoid the cost of creating a new object. */
  setSeconds(s: number): void {
    this.__valueMs = s * SECONDS;
  }
}
