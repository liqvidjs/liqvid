/* time constants */
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

// nice minus sign
const MINUS_SIGN = "\u2212";

export const timeRegexp = new RegExp(
  "^" +
    `[${MINUS_SIGN}-]?` +
    "(?:(\\d+):)?".repeat(3) +
    "(\\d+)(?:\\.(\\d+))?$",
);

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
