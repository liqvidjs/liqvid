import * as React from "react";
import Media from "./Media";

import {fragmentFromHTML} from "./utils/dom";

/** RP equivalent of <audio>. */
export default class Audio extends Media {
  /** The underlying <audio> element. */
  domElement: HTMLAudioElement;

  componentDidMount() {
    super.componentDidMount();

    // tracks
    for (const track of Array.from(this.domElement.textTracks)) {
      if (!["captions", "subtitles"].includes(track.kind))
        continue;
      let mode = track.mode;
      track.addEventListener("cuechange", () => {
        if (track.mode !== "showing") {
          if (mode === "showing")
            this.playback.captions = [];
          mode = track.mode;
          return;
        }
        mode = track.mode;
        const captions = [];
        for (const cue of Array.from(track.activeCues)) {
          const html = cue.text.replace(/\n/g, "<br/>");
          captions.push(fragmentFromHTML(html));
        }
        this.playback.captions = captions;
      });
    }
  }

  // render method
  render() {
    const {start, obstructCanPlay, obstructCanPlayThrough, children, ...attrs} = this.props;

    return (
      <audio preload="auto" ref={node => this.domElement = node} {...attrs}>
        {children}
      </audio>
    );
  }
}
