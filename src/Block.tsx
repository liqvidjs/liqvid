import * as React from "react";
import Player from "./Player";
import {bind} from "./utils/misc";

/**
  Convenience class for binding to markerupdate and timeupdate events.

  This is discouraged for new code and will likely be removed in a future release.
*/
export default class Block<P = {}, S = {}> extends React.PureComponent<P, S> {
  protected player: Player;
  static contextType = Player.Context;

  constructor(props: P, context: Player) {
    super(props, context);
    this.player = context;
    
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
