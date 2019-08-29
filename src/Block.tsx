import Player from "./Player";
import {bind} from "./utils/misc";

export default class Block<P = {}, S = {}> extends Player.PureReceiver<P, S> {
  protected player: Player;

  constructor(props: P & {player: Player}) {
    super(props);
    this.player = props.player;
    
    bind(this, ["mn", "mbn", "onMarkerUpdate", "onTimeUpdate"]);
  }

  mn(name: string) {
    return this.player.script.markerNumberOf(name);
  }

  mbn(name: string) {
    return this.player.script.markerByName(name);
  }

  componentDidMount() {
    const {playback, script} = this.player;

    playback.hub.on("seek", this.onTimeUpdate);
    playback.hub.on("timeupdate", this.onTimeUpdate);

    script.hub.on("markerupdate", this.onMarkerUpdate);
  }

  onMarkerUpdate(prevIndex: number) {}

  onTimeUpdate(t: number) {}
}
