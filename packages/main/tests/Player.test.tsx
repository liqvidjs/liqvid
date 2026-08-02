import { fireEvent, render } from "@testing-library/react";

import "./DocumentTimeline.mock";
import "./matchMedia.mock";

import { Playback, Player } from "../src/index.ts";

describe("Player", () => {
  let player: React.ComponentRef<typeof Player.Root>;

  const playback = new Playback({ duration: 60000 });

  beforeEach(() => {
    render(
      <Player.Root
        playback={playback}
        ref={(ref) => (player = ref)}
      ></Player.Root>,
    );
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
