import * as React from "react";

type Callback = (e: KeyboardEvent) => void;

interface Bindings {
  [key: string]: Callback[];
}

const modifierMap = {
  Alt: "Alt",
  Control: "Ctrl",
  Meta: "Meta",
  Shift: "Shift"
};

const mixedCaseVals = [
  "AltGraph",
  "CapsLock",
  "FnLock",
  "NumLock",
  "ScrollLock",
  "SymbolLock",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "PageDown",
  "PageUp",
  "CrSel",
  "EraseEof",
  "ExSel",
  "ContextMenu",
  "ZoomIn",
  "ZoomOut",
  "BrightnessDown",
  "BrightnessUp",
  "LogOff",
  "PowerOff",
  "PrintScreen",
  "WakeUp",
  "AllCandidates",
  "CodeInput",
  "FinalMode",
  "GroupFirst",
  "GroupLast",
  "GroupNext",
  "GroupPrevious",
  "ModeChange",
  "NextCandidate",
  "NonConvert",
  "PreviousCandidate",
  "SingleCandidate",
  "HangulMode",
  "HanjaMode",
  "JunjaMode",
  "HiraganaKatakana",
  "KanaMode",
  "KanjiMode",
  "ZenkakuHanaku",
  "AppSwitch",
  "CameraFocus",
  "EndCall",
  "GoBack",
  "GoHome",
  "HeadsetHook",
  "LastNumberRedial",
  "MannerMode",
  "VoiceDial",
  "ChannelDown",
  "ChannelUp",
  "MediaFastForward",
  "MediaPause",
  "MediaPlay",
  "MediaPlayPause",
  "MediaRecord",
  "MediaRewind",
  "MediaStop",
  "MediaTrackNext",
  "MediaTrackPrevious",
  "AudioBalanceLeft",
  "AudioBalanceRight",
  "AudioBassDown",
  "AudioBassBoostDown",
  "AudioBassBoostToggle",
  "AudioBassBoostUp",
  "AudioBassUp",
  "AudioFaderFront",
  "AudioFaderRear",
  "AudioSurroundModeNext",
  "AudioTrebleDown",
  "AudioTrebleUp",
  "AudioVolumeDown",
  "AudioVolumeMute",
  "AudioVolumeUp",
  "MicrophoneToggle",
  "MicrophoneVolumeDown",
  "MicrophoneVolumeMute",
  "MicrophoneVolumeUp",
  "TV",
  "TVAntennaCable",
  "TVAudioDescription",
  "TVAudioDescriptionMixDown",
  "TVAudioDescriptionMixUp",
  "TVContentsMenu",
  "TVDataService",
  "TVInput",
  "TVMediaContext",
  "TVNetwork",
  "TVNumberEntry",
  "TVPower",
  "TVRadioService",
  "TVSatellite",
  "TVSatelliteBS",
  "TVSatelliteCS",
  "TVSatelliteToggle",
  "TVTerrestrialAnalog",
  "TVTerrestrialDigital",
  "TVTimer",
  "AVRInput",
  "AVRPower",
  "ClosedCaptionToggle",
  "DisplaySwap",
  "DVR",
  "GuideNextDay",
  "GuidePreviousDay",
  "InstantReplay",
  "ListProgram",
  "LiveContent",
  "MediaApps",
  "MediaAudioTrack",
  "MediaLast",
  "MediaSkipBackward",
  "MediaSkipForward",
  "MediaStepBackward",
  "MediaStepForward",
  "MediaTopMenu",
  "NavigateIn",
  "NavigateNext",
  "NavigateOut",
  "NavigatePrevious",
  "NextFavoriteChannel",
  "NextUserProfile",
  "OnDemand",
  "PinPDown",
  "PinPMove",
  "PinPToggle",
  "PinPUp",
  "PlaySpeedDown",
  "PlaySpeedReset",
  "PlaySpeedUp",
  "RandomToggle",
  "RcLowBattery",
  "RecordSpeedNext",
  "RfBypass",
  "ScanChannelsToggle",
  "ScreenModeNext",
  "SplitScreenToggle",
  "STBInput",
  "STBPower",
  "VideoModeNext",
  "ZoomToggle",
  "SpeechCorrectionList",
  "SpeechInputToggle",
  "SpellCheck",
  "MailForward",
  "MailReply",
  "MailSend",
  "LaunchCalculator",
  "LaunchCalendar",
  "LaunchContacts",
  "LaunchMail",
  "LaunchMediaPlayer",
  "LaunchMusicPlayer",
  "LaunchMyComputer",
  "LaunchPhone",
  "LaunchScreenSaver",
  "LaunchSpreadsheet",
  "LaunchWebBrowser",
  "LaunchWebCam",
  "LaunchWordProcessor",
  "BrowserBack",
  "BrowserFavorites",
  "BrowserForward",
  "BrowserHome",
  "BrowserRefresh",
  "BrowserSearch",
  "BrowserStop"
];
const mixedCase = {};
for (const key of mixedCaseVals) {
  mixedCase[key.toLowerCase()] = key;
}

const modifierOrder = ["Control", "Alt", "Shift", "Meta"];

const useCode = [
  "Backspace",
  "Enter",
  "Space",
  "Tab"
];

export default class KeyMap {
  private bindings: Bindings;

  static identify(e: KeyboardEvent | React.KeyboardEvent<unknown>) {
    const parts = [];
    for (const modifier in modifierMap) {
      if (e.getModifierState(modifier)) {
        parts.push(modifierMap[modifier]);
      }
    }
    if (e.key in modifierMap) {
    } else if (e.code.startsWith("Digit")) {
      parts.push(e.code.slice(5));
    } else if (e.code.startsWith("Key")) {
      parts.push(e.code.slice(3));
    } else if (useCode.includes(e.code)) {
      parts.push(e.code);
    } else {
      parts.push(e.key);
    }
    return parts.join("+");
  }

  static normalize(seq: string) {
    return seq.split("+").map(str => {
      const lower = str.toLowerCase();

      if (str === "")
        return "";

      if (mixedCase[lower]) {
        return mixedCase[lower];
      }

      return str[0].toUpperCase() + lower.slice(1);
    }).sort((a, b) => {
      if (a in modifierMap) {
        if (b in modifierMap) {
          return modifierOrder.indexOf(a) - modifierOrder.indexOf(b);
        } else {
          return -1;
        }
      } else if (b in modifierMap) {
        return 1;
      } else {
        return cmp(a, b);
      }
    }).join("+");
  }

  constructor() {
    this.bindings = {};
  }

  bind(seq: string, cb: Callback) {
    if (seq.indexOf(",") > -1) {
      for (const atomic of seq.split(",")) {
        this.bind(atomic, cb);
      }
      return;
    }
    seq = KeyMap.normalize(seq);
    if (!this.bindings.hasOwnProperty(seq)) {
      this.bindings[seq] = [];
    }
    this.bindings[seq].push(cb);
  }

  unbind(seq: string, cb: Callback) {
    if (seq.indexOf(",") > -1) {
      for (const atomic of seq.split(",")) {
        this.unbind(atomic, cb);
      }
      return;
    }
    seq = KeyMap.normalize(seq);
    if (!this.bindings.hasOwnProperty(seq))
      throw new Error(`${seq} is not bound`);
    const index = this.bindings[seq].indexOf(cb);
    if (index < 0) {
      throw new Error(`${seq} is not bound to ${cb.name ?? "callback"}`);
    }
    this.bindings[seq].splice(index, 1);
    if (this.bindings[seq].length === 0) {
      delete this.bindings[seq];
    }
  }

  getKeys() {
    return Object.keys(this.bindings);
  }

  getHandlers(seq: string) {
    if (!this.bindings.hasOwnProperty(seq))
      return [];
    return this.bindings[seq].slice();
  }

  handle(e: KeyboardEvent) {
    let defaultPrevented = false;
    const seq = KeyMap.identify(e);

    if (!this.bindings[seq] && !this.bindings["*"])
      return;

    if (defaultPrevented) {
      e.preventDefault();
      defaultPrevented = true;
    }

    if (this.bindings[seq]) {
      for (const cb of this.bindings[seq]) {
        cb(e);
      }
    }

    if (this.bindings["*"]) {
      for (const cb of this.bindings["*"]) {
        cb(e);
      }
    }
  }
}

function titlecase(str: string) {
  if (str === "")
    return "";
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

function cmp(a: unknown, b: unknown) {
  if (a < b)
    return -1;
  else if (a === b)
    return 0;
  return 1;
}
