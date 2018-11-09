import * as React from 'react';

import Media, {MediaProps} from './Media';
import Playback from './playback';
import Player from './Player';
import {between} from './utils/misc';

class Video extends Media {
  onSeek(t: number) {
    const oldVal = this.domElement.paused;

    super.onSeek(t);

    if (this.domElement.paused === oldVal) return;

    if (this.domElement.paused)
      this.domElement.style.display = 'none';
    else
      this.domElement.style.display = 'block';
  }

  onTimeUpdate(t: number) {
    const oldVal = this.domElement.paused;

    super.onTimeUpdate(t);

    if (this.domElement.paused === oldVal) return;

    if (this.domElement.paused)
      this.domElement.style.display = 'none';
    else
      this.domElement.style.display = 'block';
  }

  // render method
  render() {
    const {playback} = this.player;

    const {player, start, children, obstructCanPlay, obstructCanPlayThrough, ...attrs} = this.props;
    (attrs as any).style = {
      ...((attrs as any).style || {}),
      display: (this.domElement && between(this.start, playback.currentTime, this.end)) ? 'block' : 'none'
    }; 

    return (
      <video ref={node => this.domElement = node} {...attrs}>
        {children}
      </video>
    );
  }
}

export default React.forwardRef<Video, MediaProps>((props, ref) => (
  <Player.Context.Consumer>
    {(player: Player) => (<Video {...props} ref={ref} player={player}/>)}
  </Player.Context.Consumer>
));
