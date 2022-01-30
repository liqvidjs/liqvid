import {Keymap} from "../src/index";

/* Modifier keys cannot be tested in Keymap::identify and Keymap.handle
   due to a bug in jsdom: https://github.com/jsdom/jsdom/issues/3126
*/

test("Keymap::identify", () => {
  const e = new KeyboardEvent("keyup", {key: "a", code: "KeyA"});
  expect(Keymap.identify(e)).toBe("A");
});

test("Keymap::normalize", () => {
  expect(Keymap.normalize("A+Shift+Ctrl")).toBe("Ctrl+Shift+A");
  expect(Keymap.normalize("q+alt+ctrl")).toBe("Ctrl+Alt+Q");
});

describe("Keymap bind handling", () => {
  const keymap = new Keymap();

  const cb = jest.fn();
  const cb2 = jest.fn();

  keymap.bind("A", cb);
  keymap.bind("B", cb2);

  test("getHandlers", () => {
    expect(keymap.getHandlers("A")).toEqual([cb]);
    expect(keymap.getHandlers("B")).toEqual([cb2]);
  });
  
  test("getKeys", () => {
    expect(keymap.getKeys()).toEqual(["A", "B"]);
  });

  test("unbind", () => {
    expect(() => keymap.unbind("C", cb)).toThrow("C is not bound");
    expect(() => keymap.unbind("B", cb)).toThrow(`B is not bound to ${cb.name}`);
    keymap.unbind("A", cb);
    expect(keymap.getHandlers("A")).toEqual([]);
  });

  test("handle", () => {
    const e = new KeyboardEvent("keyup", {key: "B", code: "KeyB"});
    keymap.handle(e);
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledWith(e);
  });
});
