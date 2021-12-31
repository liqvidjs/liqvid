/* time constants */
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

/**
 * Regular expression used to match times
 */
export const timeRegexp = new RegExp("^" + "(?:(\\d+):)?".repeat(3) + "(\\d+)(?:\\.(\\d+))?$");

/**
 * Parse a time string like "3:43" into milliseconds
 * @param str String to parse
 * @returns Time in milliseconds
 */
export function parseTime(str: string) {
  const parts = str.match(timeRegexp).slice(1)

  for (let i = 0; i < parts.length; ++i) {
    if (!parts[i]) {
      parts.splice(i, 1);
      parts.unshift("0");
    }
  }

  const [d, h, m, s, ms] = parts;
  
  const [days, hours, minutes, seconds, milliseconds] = [d, h, m, s, ms.padEnd(3, "0")].map(x => parseInt(x, 10));
  
  return milliseconds + 1000 * (seconds + 60 * (minutes + 60 * (hours + 24 * days)));
}

/**
 * Format a time as "mm:ss"
 * @param time Time in milliseconds
 * @returns Formatted time
 */
export function formatTime(time: number): string {
  if (time < 0) {
    return "\u2212" + formatTime(-time);
  }
  const days = Math.floor(time / DAYS),
        hours = Math.floor(time / HOURS % 24),
        minutes = Math.floor(time / MINUTES % 60),
        seconds = Math.floor(time / SECONDS % 60);
  
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
    return "\u2212" + formatTimeMs(-time);
  }
  const milliseconds = Math.floor(time % 1000);

  return `${formatTime(time)}.${milliseconds}`;
}
