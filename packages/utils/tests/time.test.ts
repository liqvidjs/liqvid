import {formatTime, formatTimeMs, parseTime} from "../src/time";

/* time constants */
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

const MINUS_SIGN = "\u2212";

describe("time/formatTime", () => {
  // seconds
  test("0:ss", () => {
    expect(formatTime(1 * SECONDS)).toBe("0:01");
  })

  // minutes
  test("m:ss", () => {
    expect(formatTime(1 * MINUTES + 1 * SECONDS)).toBe("1:01");
  })

  test("mm:ss", () => {
    expect(formatTime(10 * MINUTES + 20 * SECONDS)).toBe("10:20");
  })

  // hours
  test("h:0m:ss", () => {
    expect(formatTime(1 * HOURS + 1 * MINUTES + 1 * SECONDS)).toBe("1:01:01");
  })

  test("h:mm:ss", () => {
    expect(formatTime(1 * HOURS + 25 * MINUTES + 1 * SECONDS)).toBe("1:25:01");
  })

  test("hh:mm:ss", () => {
    expect(formatTime(14 * HOURS + 25 * MINUTES + 1 * SECONDS)).toBe("14:25:01");
  })

  // days
  test("dd:0h:mm:ss", () => {
    expect(formatTime(1 * DAYS + 3 * MINUTES + 4 * SECONDS)).toBe("1:00:03:04");
  });

  // negative time
  test("negative time", () => {
    expect(formatTime(-10 * MINUTES - 5 * SECONDS)).toBe(MINUS_SIGN + "10:05")
  })
})

describe("time/formatTimeMs", () => {
  test(".00x", () => {
    expect(formatTimeMs(3)).toBe("0:00.003");
  })

  test(".0xx", () => {
    expect(formatTimeMs(1 * MINUTES + 37 * SECONDS + 25)).toBe("1:37.025");
  })

  test(".xxx", () => {
    expect(formatTimeMs(1 * HOURS + 2 * MINUTES + 371)).toBe("1:02:00.371");
  })

  test(".x", () => {
    expect(formatTimeMs(10 * MINUTES + 4 * SECONDS + 300)).toBe("10:04.3");
  })

  test(".xx", () => {
    expect(formatTimeMs(8 * MINUTES + 23 * SECONDS + 420)).toBe("8:23.42");
  })
});

describe("time/parseTime", () => {
  // seconds
  test("0:ss", () => {
    expect(parseTime("0:01")).toBe(1 * SECONDS);
  })

  // minutes
  test("m:ss", () => {
    expect(parseTime("1:01")).toBe(1 * MINUTES + 1 * SECONDS);
  })

  test("mm:ss", () => {
    expect(parseTime("10:20")).toBe(10 * MINUTES + 20 * SECONDS);
  })

  // hours
  test("h:0m:ss", () => {
    expect(parseTime("1:01:01")).toBe(1 * HOURS + 1 * MINUTES + 1 * SECONDS);
  })

  test("h:mm:ss", () => {
    expect(parseTime("1:25:01")).toBe(1 * HOURS + 25 * MINUTES + 1 * SECONDS);
  })

  test("hh:mm:ss", () => {
    expect(parseTime("14:25:01")).toBe(14 * HOURS + 25 * MINUTES + 1 * SECONDS);
  })

  // days
  test("dd:0h:mm:ss", () => {
    expect(parseTime("1:00:03:04")).toBe(1 * DAYS + 3 * MINUTES + 4 * SECONDS);
  });

  // negative time
  test("negative time", () => {
    expect(parseTime("-10:05")).toBe(-10 * MINUTES - 5 * SECONDS);
    expect(parseTime(MINUS_SIGN + "10:05")).toBe(-10 * MINUTES - 5 * SECONDS);
  })
});
