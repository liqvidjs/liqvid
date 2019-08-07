import * as EventEmitter from 'events';
import * as React from 'react';

import aspectRatio from './aspectRatio';
import {requestFullScreen, exitFullScreen, isFullScreen, onFullScreenChange} from './polyfills';
import {bind} from './utils/misc';

import Playback from './playback';
import Script from './script';
import Player from './Player';

import Activities from './controls/Activities';
import FullScreen from './controls/FullScreen';
import Help from './controls/Help';
import PlayPause from './controls/PlayPause';
import ScrubberBar, {ThumbData} from './controls/ScrubberBar';
import Settings, {PLAYBACK_RATES} from './controls/Settings';
import TimeDisplay from './controls/TimeDisplay';
import Volume from './controls/Volume';

import {PlayerBroadcaster} from './shared';

const SECONDS = 1000;

interface Props {
  activities?: React.Component;
  player: Player;
  ready: boolean;
  thumbs?: ThumbData;
};

interface State {
  visible: boolean;
}

export {ThumbData};

export default class Controls extends React.PureComponent<Props, State> {
  private player: Player;
  private $helpControl: Help;
  private $settingsControl: Settings;
  private timer: number;

  captureKeys: boolean;
  hub: EventEmitter;

  constructor(props: Props) {
    super(props);
    this.player = props.player;

    this.captureKeys = true;
    this.hub = new EventEmitter();

    bind(this, ['forceUpdate', 'onKeyDown', 'resetTimer']);

    this.state = {
      visible: true
    };
  }

  canvasClick() {
    const {playback} = this.player;

    if (this.player.applyHooks('canvasClick').every(_ => _)) {
      playback.paused ? playback.play() : playback.pause();
    }
    
    this.$settingsControl.closeDialog();
  }

  componentDidMount() {
    const {playback} = this.player;

    // keyboard controls
    document.body.addEventListener('keydown', this.onKeyDown);

    // show/hiding
    document.body.addEventListener('mousemove', this.resetTimer);
    playback.hub.on('play', this.resetTimer);

    playback.hub.on('pause', () => {
      clearTimeout(this.timer);
      this.setState({visible: true});
    });

    document.body.addEventListener('mouseleave', () => {
      if (this.player.playback.paused) return;
      this.setState({visible: false});
    });
  }

  onKeyDown(e: KeyboardEvent) {
    if (!this.captureKeys) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();

    this.resetTimer();

    const {playback, script} = this.player;

    // key navigation
    switch (e.key.toLowerCase()) {
    // seeking
    case 'arrowleft':
      playback.seek(playback.currentTime - 5 * SECONDS);
      return;
    case 'j':
      playback.seek(playback.currentTime - 10 * SECONDS);
      return;
    case 'k':
    case ' ':
      playback[playback.paused ? 'play' : 'pause']();
      return;
    case 'arrowright':
      playback.seek(playback.currentTime + 5 * SECONDS);
      return;
    case 'l':
      playback.seek(playback.currentTime + 10 * SECONDS);
      return;
    // fullscreen
    case 'f':
      isFullScreen() ? exitFullScreen() : requestFullScreen();
      return;
    // playback speed
    case '<':
      playback.playbackRate = PLAYBACK_RATES[Math.max(0, PLAYBACK_RATES.indexOf(playback.playbackRate) - 1)];
      return;
    case '>':
      playback.playbackRate = PLAYBACK_RATES[Math.min(PLAYBACK_RATES.length - 1, PLAYBACK_RATES.indexOf(playback.playbackRate) + 1)];
      return;
    // volume controls
    case 'arrowup':
      playback.volume = playback.volume + 0.05;
      return;
    case 'arrowdown':
      playback.volume = playback.volume - 0.05;
      return;
    case 'm':
      playback.muted = !playback.muted;
      return;
    // seek by slide
    case 'w':
      script.back();
      return;
    case 'e':
      script.forward();
      return;
    // help control stuff
    case "?":
      this.$helpControl.toggleDialog();
      return;
    case "escape":
      this.$helpControl.closeDialog();
      return;
    }

    // percentage seeking
    const num = parseInt(e.key);
    if (!isNaN(num)) {
      playback.seek(playback.duration * num / 10);
    }
  }

  resetTimer() {
    if (this.player.playback.paused) return;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {this.setState({visible: false})}, 3000);
    this.setState({visible: true});
  }

  render() {
    const classNames = ['rp-controls'];
    if (!this.state.visible) classNames.push('hidden');

    return (
      <Player.Broadcaster>
        <div className={classNames.join(' ')}>
          <ScrubberBar thumbs={this.props.thumbs}/>
          <div className="rp-controls-buttons">
            <PlayPause/>
            {this.props.activities && <Activities list={this.props.activities}/>}
            <Volume/>
            <TimeDisplay/>
            <div className="rp-controls-float-right">
              {this.player.applyHooks('controls')}
              <Settings ref={control => this.$settingsControl = control}/>
              <Help ref={control => this.$helpControl = control}/>
              <FullScreen/>
            </div>
          </div>
        </div>
      </Player.Broadcaster>
    );
  }
}
