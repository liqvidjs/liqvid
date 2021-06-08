import * as React from "react";

import {awaitMediaCanPlay, awaitMediaCanPlayThrough} from "./utils/media";
import {between, bind} from "./utils/misc";

import type Playback from "./playback";
import Player from "./Player";

interface Props extends React.HTMLAttributes<HTMLMediaElement> {
  obstructCanPlay?: boolean;
  obstructCanPlayThrough?: boolean;
  start: number | string;
}

export default class Media extends React.PureComponent<Props> {
  protected playback: Playback;
  protected player: Player;
  protected domElement: HTMLMediaElement;
  start: number;

  static defaultProps = {
    obstructCanPlay: false,
    obstructCanPlayThrough: false
  };

  static contextType = Player.Context;
  context!: Player;

  constructor(props: Props, context: Player) {
    super(props, context);
    this.player = context;
    this.playback = context.playback;

    // get the time right
    this.start = this.player.script.parseStart(this.props.start);

    bind(this, ["pause", "play", "onPlay", "onRateChange", "onSeek", "onTimeUpdate", "onVolumeChange", "onDomPlay", "onDomPause"]);
  }

  componentDidMount() {
    // attach event listeners
    this.playback.on("pause", this.pause);
    this.playback.on("play", this.onPlay);
    this.playback.on("ratechange", this.onRateChange);
    this.playback.on("seek", this.onSeek);
    this.playback.on("seeking", this.pause);
    this.playback.on("timeupdate", this.onTimeUpdate);
    this.playback.on("volumechange", this.onVolumeChange);
    
    this.domElement.addEventListener("play", this.onDomPlay);
    this.domElement.addEventListener("pause", this.onDomPause);

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

  componentWillUnmount() {
    this.playback.off("pause", this.pause);
    this.playback.off("play", this.onPlay);
    this.playback.off("ratechange", this.onRateChange);
    this.playback.off("seek", this.onSeek);
    this.playback.off("seeking", this.pause);
    this.playback.off("timeupdate", this.onTimeUpdate);
    this.playback.off("volumechange", this.onVolumeChange);
    
    this.domElement.removeEventListener("pause", this.onDomPause);
    this.domElement.removeEventListener("play", this.onDomPlay);

    this.player.unregisterBuffer(this.domElement);
  }

  // getter
  get end() {
    return this.start + this.domElement.duration * 1000;
  }

  pause() {
    this.domElement.removeEventListener("pause", this.onDomPause);
    this.domElement.pause();
    this.domElement.addEventListener("pause", this.onDomPause);
  }

  play() {
    this.domElement.removeEventListener("play", this.onDomPlay);
    const promise = this.domElement.play();
    this.domElement.addEventListener("play", this.onDomPlay);
    return promise;
  }

  onPlay() {
    this.onTimeUpdate(this.playback.currentTime);
  }

  onRateChange() {
    this.domElement.playbackRate = this.playback.playbackRate;
  }

  onSeek(t: number) {
    if (between(this.start, t, this.end)) {
      this.domElement.currentTime = (t - this.start) / 1000;

      if (this.domElement.paused && !this.playback.paused && !this.playback.seeking)
        this.play().catch(this.playback.pause);
    } else {
      if (!this.domElement.paused)
        this.pause();
    }
  }

  onTimeUpdate(t: number) {
    if (between(this.start, t, this.end)) {
      if (!this.domElement.paused) return;

      this.domElement.currentTime = (t - this.start) / 1000;
      this.play().catch(this.playback.pause);
    } else {
      if (!this.domElement.paused)
        this.pause();
    }
  }

  onVolumeChange() {
    this.domElement.volume = this.playback.volume;
    this.domElement.muted = this.playback.muted;
  }

   onDomPlay() {
    if (this.playback.paused) {
      this.playback.off("play", this.onPlay);
      this.playback.play();
      this.playback.on("play", this.onPlay);
    }
  }

  onDomPause() {
    if (!this.playback.seeking && !this.playback.paused) {
      this.playback.off("pause", this.pause);
      this.playback.pause();
      this.playback.on("pause", this.pause);
    }
  }
}
