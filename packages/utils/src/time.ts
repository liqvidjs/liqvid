import { Duration, type DurationLike } from "@liqvid/duration";

/* time constants */
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

// nice minus sign
const MINUS_SIGN = "\u2212";

// maintain compatiblity with Effect ecosystem without making it a dependency
interface Brand<in out Keys extends string> {
  readonly "~effect/Brand": {
    readonly [K in Keys]: Keys;
  };
}

/** `hh:mm:ss` string, with `hh` and `mm` optional */
export type DurationStringWithoutMilliseconds<S extends string = string> = S &
  Brand<"DurationStringWithoutMilliseconds">;

/** `hh:mm:ss.ms` string, with `hh` and `mm` optional */
export type DurationStringWithMilliseconds<S extends string = string> = S &
  Brand<"DurationStringWithMilliseconds">;

/** `hh:mm:ss.ms` string, with `hh`, `mm`, and `ms` optional */
export type DurationString<S extends string = string> =
  | DurationStringWithoutMilliseconds<S>
  | DurationStringWithMilliseconds<S>;

/**
 * ISO8601 format for durations, used for the `datetime` attribute of `<time>` elements.
 * @see https://docs.digi.com/resources/documentation/digidocs/90001488-13/reference/r_iso_8601_duration_format.htm
 */
export type ISO8601DurationString = string & Brand<"ISO8601DurationString">;

/**
 * Regular expression used to match times
 */
export const timeRegexp = new RegExp(
  "^" +
    `[${MINUS_SIGN}-]?` +
    "(?:(\\d+):)?".repeat(3) +
    "(\\d+)(?:\\.(\\d+))?$",
);

/** Narrow a string to a {@link DurationString} if it matches `[hh:][mm:]ss[.ms]` */
export const isDurationString = (str: unknown): str is DurationString =>
  typeof str === "string" && timeRegexp.test(str);

/**
 * Parse a time string like "3:43" into milliseconds
 * @param str String to parse
 * @returns Time in milliseconds
 */
export function parseTimeMs(str: string): number {
  if (str[0] === MINUS_SIGN || str[0] === "-") {
    return -parseTimeMs(str.slice(1));
  }

  // d, h, m, s
  const parts = str.split(":").map((x) => parseInt(x, 10));
  while (parts.length < 4) {
    parts.unshift(0);
  }

  // ms
  const $_ = str.match(/\.(\d{0,3})/);
  if ($_) {
    parts.push(parseInt($_[1]!.padEnd(3, "0"), 10));
  } else {
    parts.push(0);
  }

  const [days, hours, minutes, seconds, milliseconds] = parts as [
    number,
    number,
    number,
    number,
    number,
  ];

  return (
    milliseconds +
    SECONDS * seconds +
    MINUTES * minutes +
    HOURS * hours +
    DAYS * days
  );
}

/** @deprecated use parseTimeMs instead */
export function parseTime(str: string): number {
  return parseTimeMs(str);
}

export function parseTime$(str: string): Duration {
  return new Duration({ milliseconds: parseTimeMs(str) });
}

/**
 * Format a duration as a {@link https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-duration-string time duration string}
 * for use as a {@link https://html.spec.whatwg.org/multipage/text-level-semantics.html#attr-time-datetime datetime} attribute.
 * @param time Duration in milliseconds.
 * @returns A duration string such as "PT4H18M3S".
 * @since 1.7.0
 */
export function formatTimeDuration(
  time: number | DurationLike | DurationString,
): ISO8601DurationString {
  if (typeof time === "object") {
    return formatTimeDuration(Duration.inMilliseconds(time));
  } else if (typeof time === "string") {
    return formatTimeDuration(parseTimeMs(time));
  }
  const parts = ["P"];
  const timeParts: string[] = [];

  const days = Math.floor(time / DAYS),
    hours = Math.floor((time / HOURS) % 24),
    minutes = Math.floor((time / MINUTES) % 60),
    seconds = (time / SECONDS) % 60;

  if (days > 0) {
    parts.push(`${days}D`);
  }

  if (hours > 0) {
    timeParts.push(`${hours}H`);
  }

  if (minutes > 0) {
    timeParts.push(`${minutes}M`);
  }

  if (seconds > 0) {
    timeParts.push(`${seconds.toFixed(3).replace(/\.?0+$/, "")}S`);
  }

  if (timeParts.length > 0) {
    parts.push("T", ...timeParts);
  }

  return parts.join("") as ISO8601DurationString;
}

/**
 * Format a time as "mm:ss"
 * @param time Time in milliseconds
 * @returns Formatted time
 */
export function formatTime(
  time: number | DurationLike | DurationString,
): DurationStringWithoutMilliseconds {
  if (typeof time === "object") {
    return formatTime(Duration.inMilliseconds(time));
  } else if (typeof time === "string") {
    return time.replace(/\.0+$/, "") as DurationStringWithoutMilliseconds;
  }
  if (time < 0) {
    return (MINUS_SIGN +
      formatTime(-time)) as DurationStringWithoutMilliseconds;
  }
  const days = Math.floor(time / DAYS),
    hours = Math.floor((time / HOURS) % 24),
    minutes = Math.floor((time / MINUTES) % 60),
    seconds = Math.floor((time / SECONDS) % 60);

  let firstNonzero = true;
  let str = "";
  for (const part of [days, hours, minutes]) {
    if (firstNonzero) {
      if (part !== 0) {
        firstNonzero = false;
        str += part.toString() + ":";
      }
    } else {
      str += part.toString().padStart(2, "0") + ":";
    }
  }
  // display 0:ss
  if (firstNonzero) {
    str += "0:";
  }
  str += seconds.toString().padStart(2, "0");
  return str as DurationStringWithoutMilliseconds;
}

/**
 * Format a time as "mm:ss.ms"
 * @param time Time in milliseconds
 * @returns Formatted time
 */
export function formatTimeMs(
  time: number | DurationLike | DurationString,
): DurationString {
  if (typeof time === "object") {
    return formatTimeMs(Duration.inMilliseconds(time));
  } else if (typeof time === "string") {
    return time;
  }
  if (time < 0) {
    return (MINUS_SIGN + formatTimeMs(-time)) as DurationStringWithMilliseconds;
  }
  const milliseconds = Math.floor(time % 1000);

  if (milliseconds === 0) {
    return formatTime(time);
  }

  return (formatTime(time) +
    "." +
    String(milliseconds)
      .padStart(3, "0")
      .replace(/0+$/, "")) as DurationStringWithMilliseconds;
}

/**
 * Format a millisecond timestamp as a VTT cue time (`HH:MM:SS.mmm`).
 */
export function formatVttTimestamp(
  ms: number | DurationLike,
): DurationStringWithMilliseconds {
  if (typeof ms !== "number") {
    ms = Duration.inMilliseconds(ms);
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.round(ms % 1000);

  const pad = (value: number, length = 2) =>
    value.toString().padStart(length, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}` as DurationStringWithMilliseconds;
}
