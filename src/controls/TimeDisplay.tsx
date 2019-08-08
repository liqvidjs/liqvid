import * as React from "react";

import Player from "../Player";
import {PlayerPureReceiver} from "../shared";

import {formatTime} from "../utils/time";
import {bind} from "../utils/misc";

export default class TimeDisplay extends PlayerPureReceiver {
  constructor(props: ({player: Player})) {
    super(props);

    bind(this, ["forceUpdate"]);
  }

  componentDidMount() {
    this.props.player.playback.hub.on("seek", this.forceUpdate);
    this.props.player.playback.hub.on("timeupdate", this.forceUpdate);
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
