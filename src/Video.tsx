import * as React from "react";

import Media from "./Media";
import {between} from "./utils/misc";

/** RP equivalent of <video>. */
export default class Video extends Media {
  /** The underlying <video> element. */
  domElement: HTMLVideoElement;

  onSeek(t: number) {
    const oldVal = this.domElement.paused;

    super.onSeek(t);

    if (this.domElement.paused === oldVal) return;

    if (this.domElement.paused)
      this.domElement.style.display = "none";
    else
      this.domElement.style.display = "block";
  }

  onTimeUpdate(t: number) {
    const oldVal = this.domElement.paused;

    super.onTimeUpdate(t);

    if (this.domElement.paused === oldVal) return;

    if (this.domElement.paused)
      this.domElement.style.display = "none";
    else
      this.domElement.style.display = "block";
  }

  // render method
  render() {
    const {playback} = this.context;

    const {start, children, obstructCanPlay, obstructCanPlayThrough, ...attrs} = this.props;
    attrs.style = {
      ...(attrs.style || {}),
      display: (this.domElement && between(this.start, playback.currentTime, this.end)) ? "block" : "none"
    }; 

    return (
      <video preload="auto" ref={node => this.domElement = node} {...attrs}>
        {children}
      </video>
    );
  }
}
