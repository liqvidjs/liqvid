import {Audio} from "./Audio";
import {IdMap} from "./IdMap";
import {Media} from "./Media";
import {Playback} from "./playback";
import {Player} from "./Player";
import {Script} from "./script";
import * as Utils from "./utils";
import {Video} from "./Video";
export * from "./hooks";

export {ReplayData} from "@liqvid/utils/replay-data";

export {Audio, IdMap, Media, Playback, Player, Script, Utils, Video};

// backwards compatibility
import {Keymap as KeyMap, Keymap} from "@liqvid/keymap";
export {Keymap, KeyMap};

// controls
import {Captions} from "./controls/Captions";
import {FullScreen} from "./controls/FullScreen";
import {PlayPause} from "./controls/PlayPause";
import {Settings} from "./controls/Settings";
import {ScrubberBar} from "./controls/ScrubberBar";
import {TimeDisplay} from "./controls/TimeDisplay";
import {Volume} from "./controls/Volume";

export const Controls = {Captions, FullScreen, PlayPause, ScrubberBar, Settings, TimeDisplay, Volume};

// alias
Object.defineProperty(window, "RactivePlayer", {
  get() {
    if (typeof window.Liqvid !== "undefined") {
      return window.Liqvid;
    }
  }
});

// export type
import type {useKeymap, useMarkerUpdate, usePlayback, usePlayer, useScript, useTime, useTimeUpdate} from "./hooks";

interface Liqvid {
  Audio: typeof Audio;
  Controls: typeof Controls;
  IdMap: typeof IdMap;
  Keymap: typeof Keymap;
  Media: typeof Media;
  Playback: typeof Playback;
  Player: typeof Player;
  Script: typeof Script;
  Utils: typeof Utils;
  Video: typeof Video;
  
  useKeymap: typeof useKeymap;
  useMarkerUpdate: typeof useMarkerUpdate;
  usePlayback: typeof usePlayback;
  usePlayer: typeof usePlayer;
  useScript: typeof useScript;
  useTime: typeof useTime;
  useTimeUpdate: typeof useTimeUpdate;
}

// add to global object
declare global {
  interface Window {
    Liqvid: Liqvid;

    /** @deprecated */
    RactivePlayer: Liqvid;
  }
}
