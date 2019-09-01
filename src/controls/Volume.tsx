import * as React from "react";

import Player from "../Player";
import {PlayerContext} from "../shared";

import {bind} from "../utils/misc";

export default class Volume extends React.Component {
  private player: Player;
  static contextType = PlayerContext;

  constructor(props: {}, context: Player) {
    super(props, context);
    this.player = context;

    bind(this, ["onInput"]);
  }

  componentDidMount() {
    this.player.playback.hub.on("volumechange", () => this.forceUpdate());
  }

  onInput(e: React.ChangeEvent<HTMLInputElement>) {
    this.player.playback.volume = parseFloat(e.target.value) / 100;
  }

  render() {
    const {playback} = this.player;

    return (
      <div className="rp-controls-volume">
        <svg onClick={() => playback.muted = !playback.muted} viewBox="0 0 100 100">
          <path d="M 10 35 h 20 l 25 -20 v 65 l -25 -20 h -20 z" fill="white" stroke="none"/>
          {
            playback.muted ?
              <path d="M 63 55 l 20 20 m 0 -20 l -20 20" stroke="white" strokeWidth="7"/>
              :
              (
                <g>
                  {playback.volume > 0 && <path d="M 62 32.5 a 1,1 0 0,1 0,30" fill="white" stroke="none"/>}
                  {playback.volume >= 0.5 && <path d="M 62 15 a 1,1 0 0,1 0,65 v -10 a 10,10 0 0,0 0,-45 v -10 z" fill="white" stroke="none"/>}
                </g>
              )
          }
        </svg>
        <input
          min="0"
          max="100"
          onChange={this.onInput}
          onInput={this.onInput}
          type="range"
          value={playback.muted ? 0 : playback.volume * 100}/>
      </div>
    );
  }
}
