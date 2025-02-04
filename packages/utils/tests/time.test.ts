import {
  formatTimeDuration,
  formatTime,
  formatTimeMs,
  parseTime,
} from "../src/time";

/* time constants */
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

const MINUS_SIGN = "\u2212";

describe("time/formatTimeDuration", () => {
  test("formats multi-day durations", () => {
    expect(formatTimeDuration(10 * DAYS)).toBe("P10D");
    expect(formatTimeDuration(10 * DAYS + 2 * HOURS)).toBe("P10DT2H");
    expect(formatTimeDuration(10 * DAYS + 1 * HOURS + 3 * MINUTES)).toBe(
      "P10DT1H3M",
    );
    expect(
      formatTimeDuration(10 * DAYS + 1 * HOURS + 10 * MINUTES + 3 * SECONDS),
    ).toBe("P10DT1H10M3S");
    expect(
      formatTimeDuration(
        2 * DAYS + 23 * HOURS + 3 * MINUTES + 20 * SECONDS + 337,
      ),
    ).toBe("P2DT23H3M20.337S");
  });

  test("formats sub-day durations", () => {
    expect(formatTimeDuration(1 * HOURS)).toBe("PT1H");
    expect(formatTimeDuration(10 * MINUTES)).toBe("PT10M");
    expect(formatTimeDuration(17 * HOURS + 23 * SECONDS)).toBe("PT17H23S");
    expect(formatTimeDuration(5 * MINUTES + 18 * SECONDS + 1)).toBe(
      "PT5M18.001S",
    );
    expect(formatTimeDuration(5 * SECONDS)).toBe("PT5S");
    expect(formatTimeDuration(1 * SECONDS + 50)).toBe("PT1.05S");
  });
});
describe("time/formatTime", () => {
  // seconds
  test("0:ss", () => {
    expect(formatTime(1 * SECONDS)).toBe("0:01");
  });

  // minutes
  test("m:ss", () => {
    expect(formatTime(1 * MINUTES + 1 * SECONDS)).toBe("1:01");
  });

  test("mm:ss", () => {
    expect(formatTime(10 * MINUTES + 20 * SECONDS)).toBe("10:20");
  });

  // hours
  test("h:0m:ss", () => {
    expect(formatTime(1 * HOURS + 1 * MINUTES + 1 * SECONDS)).toBe("1:01:01");
  });

  test("h:mm:ss", () => {
    expect(formatTime(1 * HOURS + 25 * MINUTES + 1 * SECONDS)).toBe("1:25:01");
  });

  test("hh:mm:ss", () => {
    expect(formatTime(14 * HOURS + 25 * MINUTES + 1 * SECONDS)).toBe(
      "14:25:01",
    );
  });

  // days
  test("dd:0h:mm:ss", () => {
    expect(formatTime(1 * DAYS + 3 * MINUTES + 4 * SECONDS)).toBe("1:00:03:04");
  });

  // negative time
  test("negative time", () => {
    expect(formatTime(-10 * MINUTES - 5 * SECONDS)).toBe(MINUS_SIGN + "10:05");
  });
});

describe("time/formatTimeMs", () => {
  test("no milliseconds", () => {
    expect(formatTimeMs(2000)).toBe("0:02");
  });

  test(".00x", () => {
    expect(formatTimeMs(3)).toBe("0:00.003");
  });

  test(".0xx", () => {
    expect(formatTimeMs(1 * MINUTES + 37 * SECONDS + 25)).toBe("1:37.025");
  });

  test(".xxx", () => {
    expect(formatTimeMs(1 * HOURS + 2 * MINUTES + 371)).toBe("1:02:00.371");
  });

  test(".x", () => {
    expect(formatTimeMs(10 * MINUTES + 4 * SECONDS + 300)).toBe("10:04.3");
  });

  test(".xx", () => {
    expect(formatTimeMs(8 * MINUTES + 23 * SECONDS + 420)).toBe("8:23.42");
  });
});

describe("time/parseTime", () => {
  test("milliseconds", () => {
    expect(parseTime("1:00.5")).toBe(60500);
    expect(parseTime("1:00.02")).toBe(60020);
    expect(parseTime("1:00.131")).toBe(60131);
  });

  // seconds
  test("0:ss", () => {
    expect(parseTime("0:01")).toBe(1 * SECONDS);
  });

  // minutes
  test("m:ss", () => {
    expect(parseTime("1:01")).toBe(1 * MINUTES + 1 * SECONDS);
  });

  test("mm:ss", () => {
    expect(parseTime("10:20")).toBe(10 * MINUTES + 20 * SECONDS);
  });

  // hours
  test("h:0m:ss", () => {
    expect(parseTime("1:01:01")).toBe(1 * HOURS + 1 * MINUTES + 1 * SECONDS);
  });

  test("h:mm:ss", () => {
    expect(parseTime("1:25:01")).toBe(1 * HOURS + 25 * MINUTES + 1 * SECONDS);
  });

  test("hh:mm:ss", () => {
    expect(parseTime("14:25:01")).toBe(14 * HOURS + 25 * MINUTES + 1 * SECONDS);
  });

  // days
  test("dd:0h:mm:ss", () => {
    expect(parseTime("1:00:03:04")).toBe(1 * DAYS + 3 * MINUTES + 4 * SECONDS);
  });

  // negative time
  test("negative time", () => {
    expect(parseTime("-10:05")).toBe(-10 * MINUTES - 5 * SECONDS);
    expect(parseTime(MINUS_SIGN + "10:05")).toBe(-10 * MINUTES - 5 * SECONDS);
  });
});
