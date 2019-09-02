import * as React from "react";
import {useEffect, useMemo, useState} from "react";

import {requestFullScreen, exitFullScreen, isFullScreen, onFullScreenChange} from "../fake-fullscreen";
import {onClick} from "../utils/mobile";

export default function FullScreen() {
  // this is stupid
  const [state, setState] = useState(isFullScreen());
  useEffect(() => {
    onFullScreenChange(() => setState(isFullScreen()));
  });
  const events = useMemo(() => onClick(() => {isFullScreen() ? exitFullScreen() : requestFullScreen();}), []);

  return (
    <svg className="rp-controls-fullscreen" {...events} viewBox="0 0 36 36">
      {state ?
      <>
        <path fill="white" d="M 14 14 h -4 v 2 h 6 v -6 h -2 v 4 z"/>
        <path fill="white" d="M 22 14 v -4 h -2 v 6 h 6 v -2 h -4 z"/>
        <path fill="white" d="M 20 26 h 2 v -4 h 4 v -2 h -6 v 6 z"/>
        <path fill="white" d="M 10 22 h 4 v 4 h 2 v -6 h -6 v 2 z"/>
      </>
        :
      <>
        <path fill="white" d="M 10 16 h 2 v -4 h 4 v -2 h -6 v 6 z"/>
        <path fill="white" d="M 20 10 v 2 h 4 v 4 h 2 v -6 h -6 z"/>
        <path fill="white" d="M 24 24 h -4 v 2 h 6 v -6 h -2 v 4 z"/>
        <path fill="white" d="M 12 20 h -2 v 6 h 6 v -2 h -4 v -4 z"/>
      </>
      }
    </svg>
  );
}
