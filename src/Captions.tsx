import * as React from "react";

import Player from "./Player";
import {PlayerContext} from "./shared";

interface Props {
  player: Player;
}

export default class Captions extends React.PureComponent<Props, {}> {
  private domElement: HTMLDivElement;
  static contextType = PlayerContext;
  context!: Player;

  componentDidMount() {
    const {playback} = this.context;

    playback.hub.on("cuechange", () => {
      this.domElement.innerHTML = "";

      for (const cue of playback.captions) {
        this.domElement.appendChild(cue);
      }
    });
  }

  render() {
    return (
      <div className="rp-captions-display" ref={node => this.domElement = node}/>
    );
  }
}