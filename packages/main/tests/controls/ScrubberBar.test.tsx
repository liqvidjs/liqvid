import * as React from "react";
import {fireEvent, render} from "@testing-library/react";

import "../matchMedia.mock";
import "../DocumentTimeline.mock";

import {Player, Script} from "../..";
import {act} from "react-dom/test-utils";

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
    fireEvent.keyDown(document.body, {key: "ArrowLeft", code: "ArrowLeft"});
    expect(playback.currentTime).toBe(25000);

    fireEvent.keyDown(document.body, {key: "ArrowRight", code: "ArrowRight"});
    expect(playback.currentTime).toBe(30000);

    fireEvent.keyDown(document.body, {key: "j", code: "KeyJ"});
    expect(playback.currentTime).toBe(20000);

    fireEvent.keyDown(document.body, {key: "l", code: "KeyL"});
    expect(playback.currentTime).toBe(30000);

    for (let i = 0; i <= 9; ++i) {
      fireEvent.keyDown(document.body, {key: String(i), code: `Digit${i}`});
      expect(playback.currentTime).toBe((60000 * i) / 10);
    }
  });

  test("Script keyboard shortcuts work", () => {
    fireEvent.keyDown(document.body, {key: "e", code: "KeyE"});
    expect(playback.currentTime).toBe(20000);
    fireEvent.keyDown(document.body, {key: "e", code: "KeyE"});
    expect(playback.currentTime).toBe(40000);
    fireEvent.keyDown(document.body, {key: "w", code: "KeyW"});
    expect(playback.currentTime).toBe(20000);
  });
});
