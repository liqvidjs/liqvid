import * as React from "react";
const {useEffect, useRef} = React;

import {usePlayer} from "./hooks";

export default function Captions() {
  const {playback} = usePlayer();
  const domElement = useRef<HTMLDivElement>();

  useEffect(() => {
    playback.on("cuechange", () => {
      domElement.current.innerHTML = "";
      for (const cue of playback.captions) {
        domElement.current.appendChild(cue);
      }
    });
  }, []);

  return (
    <div className="rp-captions-display" ref={domElement}/>
  );
}
