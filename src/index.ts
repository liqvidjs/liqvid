import Audio from "./Audio";
import IdMap from "./IdMap";
import {KeyMap} from "@liqvid/keymap";
import Media from "./Media";
import Playback from "./playback";
import Player from "./Player";
import Script from "./script";
import * as Utils from "./utils";
import Video from "./Video";

export {Audio, IdMap, KeyMap, Media, Playback, Player, Script, Utils, Video};
export * from "./hooks";

import Captions from "./controls/Captions";
import FullScreen from "./controls/FullScreen";
import PlayPause from "./controls/PlayPause";
import Settings from "./controls/Settings";
import ScrubberBar from "./controls/ScrubberBar";
import TimeDisplay from "./controls/TimeDisplay";
import Volume from "./controls/Volume";
export const Controls = {Captions, FullScreen, PlayPause, ScrubberBar, Settings, TimeDisplay, Volume};

// alias
Object.defineProperty(window, "RactivePlayer", {
  get() {
    if (typeof window.Liqvid !== "undefined") {
      return window.Liqvid;
    }
  }
});
