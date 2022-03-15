import {Player} from "liqvid";

import {MJXNonBlocking, MJXTextNonBlocking} from "./NonBlocking";

export class MJXBlocking extends MJXNonBlocking {
  static contextType = Player.Context;
  context: Player;

  async componentDidMount() {
    const player = this.context;

    player.obstruct("canplay", this.ready);
    player.obstruct("canplaythrough", this.ready);

    super.componentDidMount();
  }
}

export class MJXTextBlocking extends MJXTextNonBlocking {
  static contextType = Player.Context;
  context: Player;

  async componentDidMount() {
    const player = this.context;

    player.obstruct("canplay", this.ready);
    player.obstruct("canplaythrough", this.ready);

    super.componentDidMount();
  }
}
