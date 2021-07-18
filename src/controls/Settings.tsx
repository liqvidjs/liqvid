import * as React from "react";
import {useCallback, useEffect, useMemo, useState} from "react";

import {usePlayer} from "../hooks";
import {onClick} from "../utils/mobile";
import {useForceUpdate} from "../utils/react-utils";

export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

enum Dialogs {
  None,
  Main,
  Speed,
  Captions
}

export default function Settings() {
  const player = usePlayer(),
        {keymap, playback} = player;

  const [dialog, setDialog] = useState<Dialogs>(Dialogs.None);
  const [currentRate, setRate] = useState(playback.playbackRate);
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    // subscribe
    playback.on("ratechange", () => setRate(playback.playbackRate));
    player.hub.on("canvasClick", () => setDialog(Dialogs.None);

    // keyboard shortcuts
    keymap.bind("Shift+<", () => playback.playbackRate = PLAYBACK_RATES[Math.max(0, PLAYBACK_RATES.indexOf(playback.playbackRate) - 1)]);
    keymap.bind("Shift+>", () => playback.playbackRate = PLAYBACK_RATES[Math.min(PLAYBACK_RATES.length - 1, PLAYBACK_RATES.indexOf(playback.playbackRate) + 1)]);
  }, []);

  /* handlers */
  const setSpeed = useMemo(() => {
    const map = {};
    for (const rate of PLAYBACK_RATES) {
      map[rate] = onClick(() => {
        playback.playbackRate = rate;
        setDialog(Dialogs.Main);
      });
    }
    return map;
  }, []);
  const toggle = useMemo(() => onClick(() => setDialog(prev => (prev === Dialogs.None ? Dialogs.Main : Dialogs.None))), []);

  const toggleSubtitles = useMemo(() => onClick(() => {
    document.body.classList.toggle("lv-captions")
    forceUpdate();
  }), []);

  // event handlers
  const openMain = onClick(() => setDialog(Dialogs.Main));
  const openSpeed = onClick(() => setDialog(Dialogs.Speed));
  const openCaptions = onClick(() => setDialog(Dialogs.Captions));

  // styles
  const dialogStyle = useMemo(() => ({
    display: dialog === Dialogs.Main ? "block" : "none"
  }), [dialog === Dialogs.Main]);
  const speedDialogStyle = useMemo(() => ({
    display: dialog === Dialogs.Speed ? "block" : "none"
  }), [dialog === Dialogs.Speed]);
  const captionDialogStyle = useMemo(() => ({
    display: dialog === Dialogs.Captions ? "block" : "none"
  }), [dialog === Dialogs.Captions]);

  // captions, ugh
  const mainAudio = React.useRef<HTMLAudioElement>();
  React.useEffect(() => {
    mainAudio.current = getMainAudio(player.canvas);
    if (mainAudio.current) {
      tracks.current = captionsAndSubtitles(mainAudio.current);
    }
  }, []);
  const tracks = React.useRef<TextTrack[]>([]);
  const selectedTrack = tracks.current.find(t => t.mode === "showing");
  const setTrack = React.useMemo(() => onClick<HTMLElement>(e => {
    // get index, this is kind of ugly
    let i = -1;
    let temp = e.currentTarget as Element;
    while (temp = temp.previousElementSibling) i++;

    // hide old tracks
    for (let j = 0; j < tracks.current.length; ++j) {
      if (j !== i) {
        // this is absurd but necessary to dispatch cuechange???
        tracks.current[j].mode = "disabled";
        tracks.current[j].mode = "hidden";
        tracks.current[j].mode = "disabled";
      }
    }

    // activate new track
    if (i >= 0)
      tracks.current[i].mode = "showing";

    // refresh
    forceUpdate();
  }), []);

  return (
    <div className="lv-controls-settings">
      <div className="lv-settings-speed-dialog" style={speedDialogStyle}>
        <span className="lv-dialog-subtitle" {...openMain}>&lt; Speed</span>
        <ul>
          {PLAYBACK_RATES.map(rate => (
            <li
              className={rate === currentRate ? "selected" : ""}
              key={rate}
              {...setSpeed[rate]}
            >
              {rate === 1 ? "Normal" : rate.toString()}
            </li>
          ))}
        </ul>
      </div>
      <div className="lv-settings-captions-dialog" style={captionDialogStyle}>
        <span className="lv-dialog-subtitle" {...openMain}>&lt; Captions</span>
        <ul>
          <li className={selectedTrack ? "" : "selected"} {...setTrack}>Off</li>
          {tracks.current.map(track => (
            <li
              className={track === selectedTrack ? "selected" : ""}
              key={track.id || track.label || track.language}
              {...setTrack}
            >
              {trackLabel(track)}
            </li>
          ))}
        </ul>
      </div>
      <div className="lv-settings-dialog" style={dialogStyle}>
        <table>
          <tbody>
            <tr {...openSpeed}>
              <th scope="row">Speed</th>
              <td>{currentRate === 1 ? "Normal" : currentRate} &gt;</td>
            </tr>
            {tracks.current.length > 0 && <tr {...openCaptions}>
              <th scope="row">Subtitles ({tracks.current.length})</th>
              <td>{trackLabel(selectedTrack)} &gt;</td>
            </tr>}
          </tbody>
        </table>
      </div>
      <svg {...toggle} viewBox="0 0 48 48">
        <path
          fill="#FFF"
          d="m24.04 0.14285c-1.376 0-2.7263 0.12375-4.0386 0.34741l-0.64 6.7853c-1.3572 0.37831-2.6417 0.90728-3.8432 1.585l-5.244-4.3317c-2.2152 1.5679-4.1541 3.4955-5.7217 5.7101l4.3426 5.2437c-0.67695 1.2001-1.2177 2.4878-1.5959 3.8432l-6.7745 0.64053c-0.22379 1.3127-0.34741 2.6622-0.34741 4.0386 0 1.3788 0.12285 2.7238 0.34741 4.0386l6.7745 0.64056c0.37825 1.3554 0.91896 2.6431 1.5959 3.8432l-4.3317 5.2437c1.5648 2.2089 3.4908 4.1457 5.6997 5.7105l5.2545-4.3426c1.2023 0.67835 2.485 1.2174 3.8432 1.5959l0.64053 6.7853c1.3123 0.22368 2.6626 0.33658 4.0386 0.33658s2.7155-0.11289 4.0278-0.33658l0.64053-6.7853c1.3582-0.37847 2.6409-0.91755 3.8432-1.5959l5.2545 4.3426c2.2088-1.5649 4.1348-3.5017 5.6997-5.7105l-4.3317-5.2437c0.67695-1.2001 1.2177-2.4878 1.5959-3.8432l6.7744-0.64056c0.22456-1.3148 0.34741-2.6598 0.34741-4.0386 0-1.3765-0.12361-2.726-0.34741-4.0386l-6.7744-0.64053c-0.37825-1.3554-0.91896-2.6431-1.5959-3.8432l4.3426-5.2437c-1.568-2.2146-3.507-4.1422-5.722-5.7101l-5.2437 4.3317c-1.2015-0.67776-2.486-1.2067-3.8432-1.585l-0.641-6.7853c-1.3123-0.22366-2.6518-0.34741-4.0278-0.34741zm0 14.776c5.0178 0 9.076 4.0691 9.076 9.0869s-4.0582 9.0869-9.076 9.0869-9.0869-4.0691-9.0869-9.0869 4.0691-9.0869 9.0869-9.0869z"
        />
      </svg>
    </div>
  );
}

function getMainAudio(elt: HTMLDivElement) {
  for (const audio of Array.from(elt.querySelectorAll("audio"))) {
    if (captionsAndSubtitles(audio).length > 0)
      return audio;
  };
}

function trackLabel(track?: TextTrack) {
  if (track === undefined)
    return "Off";
  return track.label || track.language;
}

function captionsAndSubtitles(audio: HTMLAudioElement) {
  return Array.from(audio.textTracks).filter(t => ["captions", "subtitles"].includes(t.kind));
}