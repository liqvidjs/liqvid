import * as React from "react";

import Player from "../Player";
import {PlayerContext} from "../shared";

import {formatTime} from "../utils/time";

export default class TimeDisplay extends React.PureComponent {
  static contextType = PlayerContext;
  context!: Player;

  componentDidMount() {
    this.context.playback.hub.on("seek", () => this.forceUpdate());
    this.context.playback.hub.on("timeupdate", () => this.forceUpdate());
  }

  render() {
    const {playback} = this.context;

    return (
      <span className="rp-controls-time">
        <span className="rp-current-time">{formatTime(playback.currentTime)}</span>
        <span className="rp-time-separator">/</span>
        <span className="rp-total-time">{formatTime(playback.duration)}</span>
      </span>
    );
  }
}
