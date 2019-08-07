import * as React from "react";

import {PlayerPureReceiver} from "../shared";

import {bind} from "../utils/misc";

export default class PlayPause extends PlayerPureReceiver {
  constructor(props: {}) {
    super(props);

    bind(this, ["onClick", "forceUpdate"]);
  }

  componentDidMount() {
    const {playback} = this.props.player;

    playback.hub.on("pause", this.forceUpdate);
    playback.hub.on("play", this.forceUpdate);
    playback.hub.on("seeking", this.forceUpdate);
    playback.hub.on("seeked", this.forceUpdate);
    playback.hub.on("stop", this.forceUpdate);
  }

  onClick() {
    const {playback} = this.props.player;
    playback.paused ? playback.play() : playback.pause();
  }

  render() {
    const {playback} = this.props.player;

    return (
      <svg
        className="rp-controls-playpause"
        onClick={this.onClick}
        viewBox="0 0 36 36">
        {
          playback.paused || playback.seeking ?
            <path d="M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z" fill="white"/>
            :
            <path d="M 12 26 h 4 v -16 h -4 z M 21 26 h 4 v -16 h -4 z" fill="white"/>
        }
        
      </svg>
    );
  }
}
