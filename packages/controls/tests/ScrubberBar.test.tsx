import { fireEvent, render } from "@testing-library/react";

import "../matchMedia.mock";
import "../DocumentTimeline.mock";

import { Player, Script } from "liqvid";
import { act } from "react-dom/test-utils";

describe("Scrubber bar", () => {
  const script = new Script([
    ["A", "20"],
    ["B", "20"],
    ["C", "20"],
  ]);
  const playback = script.playback;

  beforeEach(() => {
    playback.seek(0);
    render(<Player script={script}></Player>);
  });

  test("Keyboard shortcuts work", () => {
    act(() => {
      playback.seek(30000);
    });
    fireEvent.keyDown(document.body, { code: "ArrowLeft", key: "ArrowLeft" });
    expect(playback.currentTime).toBe(25000);

    fireEvent.keyDown(document.body, { code: "ArrowRight", key: "ArrowRight" });
    expect(playback.currentTime).toBe(30000);

    fireEvent.keyDown(document.body, { code: "KeyJ", key: "j" });
    expect(playback.currentTime).toBe(20000);

    fireEvent.keyDown(document.body, { code: "KeyL", key: "l" });
    expect(playback.currentTime).toBe(30000);

    for (let i = 0; i <= 9; ++i) {
      fireEvent.keyDown(document.body, { code: `Digit${i}`, key: String(i) });
      expect(playback.currentTime).toBe((60000 * i) / 10);
    }
  });

  test("Script keyboard shortcuts work", () => {
    fireEvent.keyDown(document.body, { code: "KeyE", key: "e" });
    expect(playback.currentTime).toBe(20000);
    fireEvent.keyDown(document.body, { code: "KeyE", key: "e" });
    expect(playback.currentTime).toBe(40000);
    fireEvent.keyDown(document.body, { code: "KeyW", key: "w" });
    expect(playback.currentTime).toBe(20000);
  });

  test("shows buffered ranges on the timeline", () => {
    const item = { buffered: [] };

    act(() => {
      playback.registerBufferedItem(item);
      playback.updateBufferedItem(item, [[10, 30]]);
    });

    const bufferedRange = document.querySelector(".lv-progress-buffered");
    expect(bufferedRange).not.toBeNull();
    expect(bufferedRange?.getAttribute("x")).toBe(`${(10 / 60) * 100}`);
    expect(bufferedRange?.getAttribute("width")).toBe(`${(20 / 60) * 100}`);

    act(() => playback.unregisterBufferedItem(item));
  });
});
