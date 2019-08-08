import * as React from "react";

import Player from "./Player";

interface Props {
  player: Player;
}

export default class Captions extends React.PureComponent<Props, {}> {
  private domElement: HTMLDivElement;

  componentDidMount() {
    const {playback} = this.props.player;

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