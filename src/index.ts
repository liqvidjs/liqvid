import Audio from "./Audio";
import IdMap from "./IdMap";
import {KeyMap} from "@liqvid/keymap";
import Playback from "./playback";
import Player from "./Player";
import Script from "./script";
import * as Utils from "./utils";
import Video from "./Video";

export {Audio, IdMap, KeyMap, Playback, Player, Script, Utils, Video};
export * from "./hooks";

import FullScreen from "./controls/FullScreen";
import PlayPause from "./controls/PlayPause";
import Settings from "./controls/Settings";
import TimeDisplay from "./controls/TimeDisplay";
import Volume from "./controls/Volume";
export const Controls = {FullScreen, PlayPause, Settings, TimeDisplay, Volume};
