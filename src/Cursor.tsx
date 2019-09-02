import * as React from "react";

import Player from "./Player";

import {replay, ReplayData} from "./utils/animation";
import {between} from "./utils/misc";

interface Props {
  src: string;
  start: number | string;
  end: number | string;
  replay: ReplayData<[number, number]>;
}

export default class Cursor extends React.PureComponent<Props> {
  private domElement: HTMLImageElement;
  private start: number;
  private end: number;

  static contextType = Player.Context;
  private player: Player;

  constructor(props: Props, context: Player) {
    super(props, context);
    this.player = context;
    const {script} = this.player;

    this.start = (typeof props.start === "number") ? props.start : script.markerByName(props.start)[1];
    this.end = (typeof props.end === "number") ? props.end : script.markerByName(props.end)[1];
  }

  componentDidMount() {
    const {playback} = this.player;

    const {display} = this.domElement.style;
    this.domElement.style.display = "block";
    const {height, width} = this.domElement.getBoundingClientRect();
    this.domElement.style.display = display;

    const update = replay({
      data: this.props.replay,
      start: this.start,
      end: this.end,
      active: (([x, y]) => {
        Object.assign(this.domElement.style, {
          display: "block",
          left: `calc(${x}% - ${width/2}px)`,
          top: `calc(${y}% - ${height/2}px)`
        });
      }),
      inactive: () => {
        this.domElement.style.display = "none";
      },
      compressed: true
    });

    playback.hub.on("seek", () => update(playback.currentTime));
    playback.hub.on("timeupdate", update);

    update(playback.currentTime);
  }

  render() {
    const {playback} = this.player;

    const style = {
      display: between(this.start, playback.currentTime, this.end) ? "block" : "none"
    };

    return (
      <img className="rp-cursor" ref={(node) => {this.domElement = node;}} src={this.props.src} style={style}/>
    );
  }
}
