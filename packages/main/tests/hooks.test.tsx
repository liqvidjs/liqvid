import * as React from "react";
import {render} from "@testing-library/react";

import "./matchMedia.mock";
import "./DocumentTimeline.mock";

import {KeyMap, Playback, Player, Script, usePlayback, usePlayer, useKeymap, useScript} from "..";

function Test<T>(props: {
  hook: () => T;
  return: {
    value: T;
  }
}): null {
  props.return.value = props.hook();
  return null;
}

describe("Hooks", () => {
  const playback = new Playback({duration: 60000});

  test("useKeyMap", () => {
    const o = {value: null as KeyMap};
    let player: Player;
    render(<Player playback={playback} ref={ref => player = ref}><Test hook={useKeymap} return={o}/></Player>);
    expect(o.value).toBe(player.keymap);
  });

  test("usePlayback", () => {
    const o = {value: null as Playback};
    let player: Player;
    render(<Player playback={playback} ref={ref => player = ref}><Test hook={usePlayback} return={o}/></Player>);
    expect(o.value).toBe(player.playback);
  });

  test("usePlayer", () => {
    const o = {value: null as Player};
    let player: Player;
    render(<Player playback={playback} ref={ref => player = ref}><Test hook={usePlayer} return={o}/></Player>);
    expect(o.value).toBe(player);
  });

  test("useScript", () => {
    const o = {value: null as Script};
    let player: Player;
    render(<Player playback={playback} ref={ref => player = ref}><Test hook={useScript} return={o}/></Player>);
    expect(o.value).toBe(player.script);
  });
});
