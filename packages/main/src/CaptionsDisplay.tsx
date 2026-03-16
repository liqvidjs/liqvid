"use client";

import { usePlaybackEvent } from "@liqvid/playback/react";
import { useRef } from "react";

export function Captions() {
  const domElement = useRef<HTMLDivElement>(null);

  usePlaybackEvent("cuechange", ({ target: playback }) => {
    if (!domElement.current) return;

    domElement.current.innerHTML = "";
    for (const cue of playback.captions) {
      domElement.current.appendChild(cue);
    }
  });

  return <div className="lv-captions-display" ref={domElement} />;
}
