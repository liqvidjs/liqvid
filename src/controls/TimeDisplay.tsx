import * as React from 'react';

import Playback from '../playback';
import Player from '../Player';
import {PlayerPureReceiver} from '../shared';

import {formatTime, formatTimeMs} from '../utils/time';

export default class TimeDisplay extends PlayerPureReceiver {
  private playback: Playback;

  constructor(props: ({player: Player})) {
    super(props);
    this.playback = props.player.playback;
  }

  componentDidMount() {
    this.playback.hub.on('seek', () => this.forceUpdate());
    this.playback.hub.on('timeupdate', () => this.forceUpdate());
  }

  render() {
    const {playback} = this;

    return (
      <span className="rp-controls-time">
        <span className="rp-current-time">{formatTime(playback.currentTime)}</span>
        <span className="rp-time-separator">/</span>
        <span className="rp-total-time">{formatTime(playback.duration)}</span>
      </span>
    );
  }
}
