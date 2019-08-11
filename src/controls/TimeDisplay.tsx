import * as React from "react";

import {PlayerPureReceiver} from "../shared";

import {formatTime} from "../utils/time";

export default class TimeDisplay extends PlayerPureReceiver {
  componentDidMount() {
    this.props.player.playback.hub.on("seek", () => this.forceUpdate());
    this.props.player.playback.hub.on("timeupdate", () => this.forceUpdate());
  }

  render() {
    const {playback} = this.props.player;

    return (
      <span className="rp-controls-time">
        <span className="rp-current-time">{formatTime(playback.currentTime)}</span>
        <span className="rp-time-separator">/</span>
        <span className="rp-total-time">{formatTime(playback.duration)}</span>
      </span>
    );
  }
}
