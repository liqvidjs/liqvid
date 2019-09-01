import * as React from "react";

import Player from "../Player";
import {PlayerContext} from "../shared";
import ThumbnailBox, {ThumbData} from "./ThumbnailBox";

import {dragHelper} from "../utils/interactivity";
import {bind, constrain} from "../utils/misc";

export {ThumbData};

interface Props {
  thumbs: ThumbData;
}

interface State {
  progress: number;
  seeking: boolean;
  showThumb: boolean;
  thumbProgress: number;
  thumbTitle: string;
}

export default class ScrubberBar extends React.PureComponent<Props, State> {
  private scrubberBar: HTMLDivElement;
  private player: Player;
  static contextType = PlayerContext;

  constructor(props: Props, context: Player) {
    super(props, context);
    this.player = context;

    bind(this, ["onDrag", "onMouseDown", "onMouseMove", "onMouseUp"]);

    this.state = {
      progress: 0,
      seeking: false,
      showThumb: false,
      thumbProgress: 0,
      thumbTitle: null
    };
  }

  componentDidMount() {
    const {playback} = this.player;

    playback.hub.on("seek", () => this.forceUpdate());
    // playback.hub.on('seeking', () => this.forceUpdate());
    playback.hub.on("timeupdate", () => this.forceUpdate());

    // hack
    // playback.hub.on('bufferupdate', () => this.forceUpdate());
  }

  onMouseDown(e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) {
    const {playback} = this.player;
    playback.seeking = true;

    const x = isReactMouseEvent(e) ? e.pageX : e.touches[0].pageY;

    const rect = this.scrubberBar.getBoundingClientRect(),
          progress = constrain(0, (x - rect.left) / rect.width, 1);

    playback.seek(progress * playback.duration);
  }

  onDrag(e: MouseEvent, {x}: {x: number}) {
    const {playback} = this.player;
    const rect = this.scrubberBar.getBoundingClientRect(),
          progress = constrain(0, (x - rect.left) / rect.width, 1);

    playback.seek(progress * playback.duration);
  }

  onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = this.scrubberBar.getBoundingClientRect(),
          thumbProgress = constrain(0, (e.pageX - rect.left) / rect.width, 1);

    this.setState({thumbProgress});
  }

  onMouseUp() {
    this.player.playback.seeking = false;
  }

  render() {
    const {playback/*, buffers*/} = this.player;

    const progress = (playback.currentTime / playback.duration * 100);

    // const thumbFrequency = 1;
    const {thumbProgress} = this.state;
    // thumbTime = thumbProgress * playback.duration,
    // thumbName = Math.floor(thumbTime / 1000 / thumbFrequency);

    const highlights = (this.props.thumbs && this.props.thumbs.highlights) || [];

    // const ranges = Array.from(buffers.values()).reduce((a, b) => a.concat(b), []);

    const listener = dragHelper(this.onDrag, this.onMouseDown, this.onMouseUp);

    return (
      <div
        className="rp-controls-scrub"
        onMouseDown={listener}
        onTouchStart={listener}
        ref={node => this.scrubberBar = node}
      >
        {this.props.thumbs &&
        <ThumbnailBox
          {...this.props.thumbs}
          player={this.player}
          progress={thumbProgress}
          show={this.state.showThumb}
          title={this.state.thumbTitle}/>
        }

        <div
          className="rp-controls-scrub-wrap" 
          onMouseOver={() => this.setState({showThumb: true})}
          onMouseMove={this.onMouseMove}
          onMouseOut={() => this.setState({showThumb: false})}
        >
          <svg className="rp-controls-scrub-progress" preserveAspectRatio="none" viewBox="0 0 100 10">
            <rect className="rp-progress-elapsed" x="0" y="0" height="10" width={progress}/>
            <rect className="rp-progress-remaining" x={progress} y="0" height="10" width={100 - progress}/>

            {/*ranges.map(([start, end]) => (
              <rect
                key={`${start}-${end}`} className="controls-progress-buffered"
                x={start / playback.duration * 100} y="0" height="10" width={(end - start) / playback.duration * 100}/>
            ))*/}

            {highlights.map(({time, title}) => (
              <rect
                key={time}
                className={["rp-thumb-highlight"].concat(time <= playback.currentTime ? "past" : []).join(" ")}
                onMouseOver={() => this.setState({thumbTitle: title})}
                onMouseOut={() => this.setState({thumbTitle: null})}
                x={time / playback.duration * 100}
                y="0"
                width="1"
                height="10"
              />
            ))}
          </svg>
          <svg className="rp-scrubber" style={{left: `calc(${progress}% - 6px)`}} viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50" stroke="none"/>
          </svg>
        </div>
      </div>
    );
  }
}

function isReactMouseEvent(e: React.SyntheticEvent): e is React.MouseEvent {
  return e.nativeEvent instanceof MouseEvent;
}
