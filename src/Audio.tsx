import * as React from "react";
import Media from "./Media";

import {fragmentFromHTML} from "./utils/dom";

export default class Audio extends Media {
  domElement: HTMLAudioElement;

  componentDidMount() {
    super.componentDidMount();

    const {playback} = this.player;

    // tracks
    for (const track of Array.from(this.domElement.textTracks)) {
      track.addEventListener("cuechange", () => {
        const captions = [];
        for (const cue of Array.from(track.activeCues)) {
          const html = cue.text.replace(/\n/g, "<br/>");
          captions.push(fragmentFromHTML(html));
        }

        playback.captions = captions;
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
