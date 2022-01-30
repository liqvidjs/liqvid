import {animate, replay} from "../src/animation";
import {ReplayData} from "../src/replay-data";

describe("animation/animate", () => {
  test("defaults", () => {
    const fn = animate({startTime: 0, duration: 1000});
    expect(fn(0)).toBe(0);
    expect(fn(1000)).toBe(1);
    expect(fn(500)).toBe(0.5);
  });

  test("basic test", () => {
    const fn = animate({
      startTime: 1000,
      duration: 1000,
      startValue: 2,
      endValue: 4
    });

    expect(fn(500)).toBe(2);
    expect(fn(3000)).toBe(4);
    expect(fn(1500)).toBe(3);
  });

  test("called with array", () => {
    const fn = animate([
      {startTime: 500, duration: 500, startValue: 2, endValue: 4},
      {startTime: 1500, duration: 1000, startValue: 6, endValue: 8}
    ]);

    expect(fn(0)).toBe(2);
    expect(fn(750)).toBe(3);
    expect(fn(1200)).toBe(4);
    expect(fn(2000)).toBe(7);
  });
});

describe("animation/replay", () => {
  test("compressed", () => {
    const data: ReplayData<string> = [[0, "a"], [500, "b"], [500, "c"]];
    const active = jest.fn();
    const inactive = jest.fn();

    const fn = replay({
      data,
      start: 500,
      end: 2000,
      compressed: true,
      active,
      inactive
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
    const data: ReplayData<string> = [[0, "a"], [500, "b"], [1000, "c"]];
    const active = jest.fn();
    const inactive = jest.fn();

    const fn = replay({
      data,
      start: 500,
      end: 2000,
      compressed: false,
      active,
      inactive
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
});
