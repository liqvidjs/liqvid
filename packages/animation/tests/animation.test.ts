import { animate, bezier, type ReplayData, replay } from "../src/index";

describe("animation/animate", () => {
  test("defaults", () => {
    const fn = animate({ duration: 1000, startTime: 0 });
    expect(fn(0)).toBe(0);
    expect(fn(1000)).toBe(1);
    expect(fn(500)).toBe(0.5);
  });

  test("basic test", () => {
    const fn = animate({
      duration: 1000,
      endValue: 4,
      startTime: 1000,
      startValue: 2,
    });

    expect(fn(500)).toBe(2);
    expect(fn(3000)).toBe(4);
    expect(fn(1500)).toBe(3);
  });

  test("called with array", () => {
    const fn = animate([
      { duration: 500, endValue: 4, startTime: 500, startValue: 2 },
      { duration: 1000, endValue: 8, startTime: 1500, startValue: 6 },
    ]);

    expect(fn(0)).toBe(2);
    expect(fn(750)).toBe(3);
    expect(fn(1200)).toBe(4);
    expect(fn(2000)).toBe(7);
  });
});

describe("animation/bezier", () => {
  test("bezier imported correctly", () => {
    expect(typeof bezier).toBe("function");
  });
});

describe("animation/replay", () => {
  test("compressed", () => {
    const data: ReplayData<string> = [
      [0, "a"],
      [500, "b"],
      [500, "c"],
    ];
    const active = jest.fn();
    const inactive = jest.fn();

    const fn = replay({
      active,
      compressed: true,
      data,
      end: 2000,
      inactive,
      start: 500,
    });

    // functions shouldn't be called yet
    expect(active).not.toHaveBeenCalled();
    expect(inactive).not.toHaveBeenCalled();

    // before start
    fn(0);
    expect(active).not.toHaveBeenCalled();
    expect(inactive).toHaveBeenCalled();

    // don't call inactive repeatedly
    fn(0);
    expect(inactive).toHaveBeenCalledTimes(1);

    // active tests
    fn(600);
    expect(active).toHaveBeenLastCalledWith("a", 0);
    fn(1000);
    expect(active).toHaveBeenLastCalledWith("b", 1);
    fn(1700);
    expect(active).toHaveBeenLastCalledWith("c", 2);

    // inactive again
    fn(2000);
    fn(2000);
    expect(inactive).toHaveBeenCalledTimes(2);
  });

  test("uncompressed", () => {
    const data: ReplayData<string> = [
      [0, "a"],
      [500, "b"],
      [1000, "c"],
    ];
    const active = jest.fn();
    const inactive = jest.fn();

    const fn = replay({
      active,
      compressed: false,
      data,
      end: 2000,
      inactive,
      start: 500,
    });

    // functions shouldn't be called yet
    expect(active).not.toHaveBeenCalled();
    expect(inactive).not.toHaveBeenCalled();

    // before start
    fn(0);
    expect(active).not.toHaveBeenCalled();
    expect(inactive).toHaveBeenCalled();

    // don't call inactive repeatedly
    fn(0);
    expect(inactive).toHaveBeenCalledTimes(1);

    // active tests
    fn(600);
    expect(active).toHaveBeenLastCalledWith("a", 0);
    fn(1000);
    expect(active).toHaveBeenLastCalledWith("b", 1);
    fn(1700);
    expect(active).toHaveBeenLastCalledWith("c", 2);

    // inactive again
    fn(2000);
    fn(2000);
    expect(inactive).toHaveBeenCalledTimes(2);
  });

  test("units", () => {
    const data: ReplayData<string> = [
      [0, "a"],
      [500, "b"],
      [500, "c"],
    ];
    const active = jest.fn();
    const inactive = jest.fn();

    const fn = replay({
      active,
      compressed: true,
      data,
      end: 2,
      inactive,
      start: 0.5,
      units: 1000,
    });

    // functions shouldn't be called yet
    expect(active).not.toHaveBeenCalled();
    expect(inactive).not.toHaveBeenCalled();

    // before start
    fn(0);
    expect(active).not.toHaveBeenCalled();
    expect(inactive).toHaveBeenCalled();

    // don't call inactive repeatedly
    fn(0);
    expect(inactive).toHaveBeenCalledTimes(1);

    // active tests
    fn(0.6);
    expect(active).toHaveBeenLastCalledWith("a", 0);
    fn(1);
    expect(active).toHaveBeenLastCalledWith("b", 1);
    fn(1.7);
    expect(active).toHaveBeenLastCalledWith("c", 2);

    // inactive again
    fn(2);
    fn(2);
    expect(inactive).toHaveBeenCalledTimes(2);
  });
});
