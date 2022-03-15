import * as React from "react";

import {Media} from "./Media";

/** Liqvid equivalent of {@link HTMLVideoElement `<video>`}. */
export class Video extends Media {
  /** The underlying <video> element. */
  declare domElement: HTMLVideoElement;

  // render method
  render() {
    const {start, children, obstructCanPlay, obstructCanPlayThrough, ...attrs} = this.props;

    return (
      <video playsInline preload="auto" ref={node => this.domElement = node} {...attrs}>
        {children}
      </video>
    );
  }
}
