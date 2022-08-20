/* time constants */
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

// nice minus sign
const MINUS_SIGN = "\u2212";

/**
 * Regular expression used to match times
 */
export const timeRegexp = new RegExp(
  "^" + "(?:(\\d+):)?".repeat(3) + "(\\d+)(?:\\.(\\d+))?$"
);

/**
 * Parse a time string like "3:43" into milliseconds
 * @param str String to parse
 * @returns Time in milliseconds
 */
export function parseTime(str: string): number {
  if (str[0] === MINUS_SIGN || str[0] === "-") {
    return -parseTime(str.slice(1));
  }

  // d, h, m, s
  const parts = str.split(":").map((x) => parseInt(x, 10));
  while (parts.length < 4) {
    parts.unshift(0);
  }

  // ms
  const $_ = str.match(/\.(\d{0,3})/);
  if ($_) {
    parts.push(parseInt($_[1].padEnd(3, "0")));
  } else {
    parts.push(0);
  }

  const [days, hours, minutes, seconds, milliseconds] = parts;

  return (
    milliseconds + 1000 * (seconds + 60 * (minutes + 60 * (hours + 24 * days)))
  );
}

/**
 * Format a duration as a {@link https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-duration-string time duration string}
 * for use as a {@link https://html.spec.whatwg.org/multipage/text-level-semantics.html#attr-time-datetime datetime} attribute.
 * @param time Duration in milliseconds.
 * @returns A duration string such as "PT4H18M3S".
 * @since 1.7.0
 */
export function formatTimeDuration(time: number): string {
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

  return parts.join("");
}

/**
 * Format a time as "mm:ss"
 * @param time Time in milliseconds
 * @returns Formatted time
 */
export function formatTime(time: number): string {
  if (time < 0) {
    return MINUS_SIGN + formatTime(-time);
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
  return str;
}

/**
 * Format a time as "mm:ss.ms"
 * @param time Time in milliseconds
 * @returns Formatted time
 */
export function formatTimeMs(time: number): string {
  if (time < 0) {
    return MINUS_SIGN + formatTimeMs(-time);
  }
  const milliseconds = Math.floor(time % 1000);

  if (milliseconds === 0) {
    return formatTime(time);
  }

  return (
    formatTime(time) +
    "." +
    String(milliseconds).padStart(3, "0").replace(/0+$/, "")
  );
}
