import * as React from 'react';

import Player from './Player';
import {bind} from './utils/misc';

export default class Block<P = {}, S = {}> extends Player.PureReceiver<P, S> {
  protected player: Player;

  sbn: (name: string) => [string, number, number];
  sn: (name: string) => number;

  constructor(props: P & {player: Player}) {
    super(props);
    this.player = props.player;

    const {script} = this.player;

    this.sbn = script.slideByName.bind(script);
    this.sn = script.slideNumberOf.bind(script);

    bind(this, ['onSlideUpdate', 'onTimeUpdate']);
  }

  componentDidMount() {
    const {playback, script} = this.player;

    playback.hub.on('seek', this.onTimeUpdate);
    playback.hub.on('timeupdate', this.onTimeUpdate);

    script.hub.on('slideupdate', this.onSlideUpdate);
  }

  onSlideUpdate(prevIndex: number) {}

  onTimeUpdate(t: number) {}
}
