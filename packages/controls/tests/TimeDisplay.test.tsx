import { Playback } from "@liqvid/playback";
import { Player } from "@liqvid/player";
import { render } from "@testing-library/react";
import { act } from "react";

import "../matchMedia.mock";
import "../DocumentTimeline.mock";

describe("Time display button", () => {
  let display: HTMLButtonElement;

  const playback = new Playback();
  playback.duration$ = { minutes: 1 };

  beforeEach(() => {
    render(<Player playback={playback}></Player>);
    act(() => {
      playback.currentTime = 0;
      playback.duration = 60000;
    });
    display = document.querySelector(".lv-controls-time");
  });

  test("displays correct time", () => {
    expect(display.textContent).toBe("0:00/1:00");
    act(() => {
      playback.seek(30500);
    });
    expect(display.textContent).toBe("0:30/1:00");
  });

  test("responds to duration changes", () => {
    act(() => {
      playback.duration = 120500;
    });
    expect(display.textContent).toBe("0:00/2:00");
  });
});
