import * as React from "react";
import {useEffect, useRef} from "react";

import {usePlayback} from "@liqvid/playback/react";

export default function Captions() {
  const playback = usePlayback();
  const domElement = useRef<HTMLDivElement>();

  useEffect(() => {
    playback.on("cuechange", () => {
      domElement.current.innerHTML = "";
      for (const cue of playback.captions) {
        domElement.current.appendChild(cue);
      }
    });
  }, []);

  return <div className="lv-captions-display" ref={domElement} />;
}
