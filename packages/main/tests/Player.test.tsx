import * as React from "react";
import {fireEvent, render} from "@testing-library/react";

import "./matchMedia.mock";
import "./DocumentTimeline.mock";

import {Playback, Player} from "..";

describe("Player", () => {
  let player: Player;
  
  const playback = new Playback({duration: 60000});

  beforeEach(() => {
    render(<Player playback={playback} ref={ref => player = ref}></Player>);
  });

  test("canvas", () => {
    expect(player.canvas).toBeInstanceOf(HTMLDivElement);
  });

  test("canvasClick", () => {
    fireEvent.mouseUp(player.canvas);
    expect(playback.paused).toBe(false);
    fireEvent.mouseUp(player.canvas);
    expect(playback.paused).toBe(true);
  });

  test("symbol", () => {
    expect(player.canvas.parentElement[Player.symbol]).toBe(player);
  });
});
