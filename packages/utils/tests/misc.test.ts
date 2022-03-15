import {between, bind, clamp, constrain, lerp, range, wait, waitFor} from "../src/misc";

jest.useFakeTimers();
jest.spyOn(global, "setTimeout");

describe("misc/between", () => {
  test("Lower bound inclusive", () => {
    expect(between(0, 0, 1)).toBe(true);
  });

  test("Upper bound exclusive", () => {
    expect(between(0, 1, 1)).toBe(false);
  });

  test("Between works", () => {
    expect(between(0, 0.5, 1)).toBe(true);
  });

  test("Below works", () => {
    expect(between(0, -1, 1)).toBe(false);
  });

  test("Above works", () => {
    expect(between(0, 2, 1)).toBe(false);
  });
});

describe("misc/bind", () => {
  test("bind works", () => {
    const o = {
      a() {
        return this;
      }
    };
    const p = {};
    bind(o, ["a"]);

    expect(o.a.call(p)).toBe(o);
  });  
});

describe("misc/lerp", () => {
  test("lerp works", () => {
    expect(lerp(1, 3, 0.5)).toBe(2);
  });
});

describe("misc/clamp", () => {
  test("clamp below", () => {
    expect(clamp(0, -1, 5)).toBe(0);
    expect(constrain(0, -1, 5)).toBe(0);
  });

  test("clamp neutral", () => {
    expect(clamp(0, 2, 5)).toBe(2);
    expect(constrain(0, 2, 5)).toBe(2);
  });

  test("clamp above ", () => {
    expect(clamp(0, 7, 5)).toBe(5);
    expect(constrain(0, 7, 5)).toBe(5);
  });
});

describe("misc/range", () => {
  test("two arguments", () => {
    expect(range(1, 4)).toEqual([1,2,3]);
  });

  test("one argument", () => {
    expect(range(3)).toEqual([0, 1, 2]);
  });
});

describe("misc/wait", () => {
  test("waits 1 second", () => {
    let resolved = false;
    const promise = wait(1000).then(() => resolved = true);

    // setTimeout should have been called but not resolved
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    expect(resolved).toBe(false);

    jest.runAllTimers();
   
    // now callback should have been called
    expect(promise).resolves.toBe(true);
  });
});

describe("misc/waitFor", () => {
  test("waits for condition", () => {
    let val = 0;
    let resolved = false;
    const callback = jest.fn(() => val === 1);

    const promise = waitFor(callback).then(() => resolved = true);

    // should be called once initially
    expect(callback).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(false);

    // run, fail
    jest.runOnlyPendingTimers();
    expect(callback).toHaveBeenCalledTimes(2);
    expect(resolved).toBe(false);

    // run again, fail
    jest.runOnlyPendingTimers();
    expect(callback).toHaveBeenCalledTimes(3);
    expect(resolved).toBe(false);

    // run again, succeed
    val = 1;
    jest.runOnlyPendingTimers();
    expect(callback).toHaveBeenCalledTimes(4);
    expect(promise).resolves.toBe(true);
  });
});
