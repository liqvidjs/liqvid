import { fireEvent, render } from "@testing-library/react";

import "../matchMedia.mock";
import "../DocumentTimeline.mock";

import { Playback } from "@liqvid/playback";
import { Player } from "@liqvid/player";
import { act } from "react";

describe("Play/pause button", () => {
  let button: HTMLButtonElement;

  const playback = new Playback();
  playback.duration = 60;

  beforeEach(() => {
    render(<Player playback={playback}></Player>);
    act(() => {
      playback.pause();
      playback.seeking = false;
    });
    button = document.querySelector(".lv-controls-playpause > svg");
  });

  test("Clicking button toggles", () => {
    fireEvent.click(button);
    expect(playback.paused).toBe(false);
    fireEvent.click(button);
    expect(playback.paused).toBe(true);
  });

  test("Icon updates", () => {
    expect(button).toMatchSnapshot();
    act(() => {
      playback.play();
    });
    expect(button).toMatchSnapshot();
    act(() => {
      playback.seeking = true;
    });
    expect(button).toMatchSnapshot();
  });

  test("Keyboard shortcuts work", () => {
    fireEvent.keyDown(document.body, { code: "KeyK", key: "K" });
    expect(playback.paused).toBe(false);

    fireEvent.keyDown(document.body, { code: "KeyK", key: "K" });
    expect(playback.paused).toBe(true);

    fireEvent.keyDown(document.body, { code: "Space", key: " " });
    expect(playback.paused).toBe(false);

    fireEvent.keyDown(document.body, { code: "Space", key: " " });
    expect(playback.paused).toBe(true);
  });
});
