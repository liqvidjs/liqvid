import Player from "./Player";
import {bind} from "./utils/misc";

export default class Block<P = {}, S = {}> extends Player.PureReceiver<P, S> {
  protected player: Player;

  constructor(props: P & {player: Player}) {
    super(props);
    this.player = props.player;
    
    bind(this, ["sn", "sbn", "mn", "mbn", "onMarkerUpdate", "onSlideUpdate", "onTimeUpdate"]);
  }

  sn(name: string) {
    return this.mn(name);
  }

  sbn(name: string) {
    return this.mbn(name);
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

    script.hub.on("slideupdate", this.onSlideUpdate);
    script.hub.on("markerupdate", this.onMarkerUpdate);
  }

  onSlideUpdate(prevIndex: number) {}
  onMarkerUpdate(prevIndex: number) {}

  onTimeUpdate(t: number) {}
}
