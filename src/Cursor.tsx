import * as React from 'react';

import Playback from './playback';
import Player from './Player';

import {replay, ReplayData} from './utils/animation';

interface Props {
  src: string;
  start: number | string;
  end: number | string;
  replay: ReplayData<[number, number]>;
}

class Cursor extends React.PureComponent<Props & {player: Player}, {}> {
  private domElement: HTMLImageElement;
  private start: number;
  private end: number;

  constructor(props: Props & {player: Player}) {
    super(props);
    const {script} = this.props.player;

    this.start = (typeof props.start === 'number') ? props.start : script.slideByName(props.start)[1];
    this.end = (typeof props.end === 'number') ? props.end : script.slideByName(props.end)[1];
  }

  componentDidMount() {
    const {playback} = this.props.player;

    const {display} = this.domElement.style;
    this.domElement.style.display = 'block';
    const {height, width} = this.domElement.getBoundingClientRect();
    this.domElement.style.display = display;

    const update = replay({
      data: this.props.replay,
      start: this.start,
      end: this.end,
      active: (([x, y]) => {
        Object.assign(this.domElement.style, {
          display: 'block',
          left: `calc(${x}vmin - ${width/2}px)`,
          top: `calc(${y}vmin - ${height/2}px)`
        });
      }),
      inactive: () => {
        this.domElement.style.display = 'none';
      }
    });

    playback.hub.on('seek', () => update(playback.currentTime));
    playback.hub.on('timeupdate', update);

    update(playback.currentTime);
  }

  render() {
    const {playback} = this.props.player;

    const style = {
      display: (this.start <= playback.currentTime && playback.currentTime < this.end) ? 'block' : 'none'
    };

    return (
      <img className="rp-cursor" ref={(node) => {this.domElement = node}} src={this.props.src} style={style}/>
    );
  }
}

export default React.forwardRef<Cursor, Props>((props, ref) => (
  <Player.Context.Consumer>
    {(player: Player) => (<Cursor {...props} ref={ref} player={player} />)}
  </Player.Context.Consumer>
));
