import * as React from "react";

import {awaitMediaCanPlay, awaitMediaCanPlayThrough} from "./utils/media";
import {bind} from "./utils/misc";
import {parseTime} from "./utils/time";

import Player from "./Player";

interface Props extends React.HTMLAttributes<HTMLMediaElement> {
  obstructCanPlay?: boolean;
  obstructCanPlayThrough?: boolean;
  start: number | string;
}

export default class Media extends React.PureComponent<Props, {}> {
  protected player: Player;
  protected domElement: HTMLMediaElement;
  start: number;

  static defaultProps = {
    obstructCanPlay: false,
    obstructCanPlayThrough: false
  };

  static contextType = Player.Context;
  context!: Player;

  constructor(props: Props) {
    super(props);

    bind(this, ["onPause", "onPlay", "onRateChange", "onSeek", "onSeeking", "onTimeUpdate", "onVolumeChange"]);
  }

  componentDidMount() {
    this.player = this.context;
    
    // get the time right
    if (typeof this.props.start === "string") {
      if (this.props.start.match(/^(?:(?:(\d+):)?(\d+):)?(\d+)(?:\.(\d+))?$/))
        this.start = parseTime(this.props.start);
      else
        this.start = this.player.script.markerByName(this.props.start)[1];
    } else {
      this.start = this.props.start;
    }
    
    // attach event listeners
    const {playback} = this.player;
    
    playback.hub.on("pause", this.onPause);
    playback.hub.on("play", this.onPlay);
    playback.hub.on("ratechange", this.onRateChange);
    playback.hub.on("seek", this.onSeek);
    playback.hub.on("seeked", this.onSeek);
    playback.hub.on("seeking", this.onSeeking);
    playback.hub.on("timeupdate", this.onTimeUpdate);
    playback.hub.on("volumechange", this.onVolumeChange);

    // canplay/canplaythrough events
    if (this.props.obstructCanPlay) {
      this.player.obstruct("canplay", awaitMediaCanPlay(this.domElement));
    }
    if (this.props.obstructCanPlayThrough) {
      this.player.obstruct("canplaythrough", awaitMediaCanPlayThrough(this.domElement));
    }

    // need to call this once initially
    this.onVolumeChange();

    // progress updater?    
    const getBuffers = () => {
      const ranges = this.domElement.buffered;

      const buffers: [number, number][] = [];
      for (let i = 0; i < ranges.length; ++i) {
        if (ranges.end(i) === Infinity) continue;
        buffers.push([ranges.start(i) * 1000 + this.start, ranges.end(i) * 1000 + this.start]);
      }

      return buffers;
    };

    const updateBuffers = () => {
      this.player.updateBuffer(this.domElement, getBuffers());
    };

    this.player.registerBuffer(this.domElement);
    updateBuffers();
    this.domElement.addEventListener("progress", updateBuffers);
    // setInterval(updateBuffers, 1000);
    // this.domElement.addEventListener('load', updateBuffers);
  }

  // getter
  get end() {
    return this.start + this.domElement.duration * 1000;
  }

  onPlay() {
    this.onTimeUpdate(this.player.playback.currentTime);
  }

  onPause() {
    this.domElement.pause();
  }

  onRateChange() {
    this.domElement.playbackRate = this.player.playback.playbackRate;
  }

  onSeeking() {
    this.domElement.pause();
  }

  onSeek(t: number) {
    const {playback} = this.player;

    if (this.start <= t && t < this.end) {
      this.domElement.currentTime = (t - this.start) / 1000;

      if (this.domElement.paused && !playback.paused && !playback.seeking)
        this.domElement.play().catch(this.player.playback.pause);
    } else {
      if (!this.domElement.paused)
        this.domElement.pause();
    }
  }

  onTimeUpdate(t: number) {
    if (this.start <= t && t < this.end) {
      if (!this.domElement.paused) return;

      this.domElement.currentTime = (t - this.start) / 1000;
      this.domElement.play().catch(this.player.playback.pause);
    } else {
      if (!this.domElement.paused)
        this.domElement.pause();
    }
  }

  onVolumeChange() {
    const {playback} = this.player;

    this.domElement.volume = playback.volume;
    this.domElement.muted = playback.muted;
  }
}
