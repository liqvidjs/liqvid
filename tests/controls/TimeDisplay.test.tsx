import * as React from "react";
import {render} from "@testing-library/react";

import "../matchMedia.mock";
import "../DocumentTimeline.mock";

import {Playback, Player} from "../../dist/liqvid";
import {act} from "react-dom/test-utils";

describe("Time display button", () => {
  let display: HTMLButtonElement;
  
  const playback = new Playback({duration: 60000});

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
