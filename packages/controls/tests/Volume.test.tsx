import { Playback } from "@liqvid/playback";
import { Player } from "@liqvid/player";
import { fireEvent, render } from "@testing-library/react";
import { act } from "react";

import "../matchMedia.mock";
import "../DocumentTimeline.mock";

describe("Volume button", () => {
  let button: HTMLButtonElement;
  let slider: HTMLInputElement;

  const playback = new Playback();
  playback.duration$ = { minutes: 1 };

  beforeEach(() => {
    render(<Player.Root playback={playback}></Player.Root>);
    act(() => {
      playback.muted = false;
      playback.volume = 1;
    });
    button = document.querySelector(".lv-controls-volume > button > svg");
    slider = document.querySelector(".lv-controls-volume > input");
  });

  test("Pressing button mutes", () => {
    fireEvent.click(button);
    expect(playback.muted).toBe(true);
    fireEvent.click(button);
    expect(playback.muted).toBe(false);
  });

  test("Setting volume works", () => {
    fireEvent.change(slider, { target: { value: 70 } });
    expect(playback.volume).toBe(0.7);
  });

  test("Setting volume updates button icon", () => {
    expect(button).toMatchSnapshot();

    fireEvent.change(slider, { target: { value: 40 } });
    expect(button).toMatchSnapshot();

    fireEvent.change(slider, { target: { value: 0 } });
    expect(button).toMatchSnapshot();
  });

  test("Keyboard shortcuts work", () => {
    fireEvent.keyDown(document.body, { code: "ArrowDown", key: "ArrowDown" });
    fireEvent.keyDown(document.body, { code: "ArrowDown", key: "ArrowDown" });
    expect(playback.volume).toBeCloseTo(0.9, 5);

    fireEvent.keyDown(document.body, { code: "ArrowUp", key: "ArrowUp" });
    expect(playback.volume).toBeCloseTo(0.95, 5);

    fireEvent.keyDown(document.body, { code: "KeyM", key: "M" });
    expect(playback.muted).toBe(true);
  });
});
