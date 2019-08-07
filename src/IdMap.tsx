import * as React from "react";

import Player from "./Player";

import {bind} from "./utils/misc";
import {recursiveMap} from "./utils/react-utils";

interface Props {
  map?: object;
}

export default class IdMap extends React.PureComponent<Props, {}> {
  static Context = React.createContext();
  public foundIds: Set<string>;

  constructor(props: Props) {
    super(props);
    bind(this, ["renderContent"]);

    this.foundIds = new Set();
  }

  render() {
    if (this.props.hasOwnProperty("map")) {
      return (
        <IdMap.Context.Provider value={[this.foundIds, this.props.map]}>
          {this.renderContent([this.foundIds, this.props.map])}
        </IdMap.Context.Provider>
      );
    } else {
      return (
        <IdMap.Context.Consumer>
          {this.renderContent}
        </IdMap.Context.Consumer>
      );
    }
  }

  renderContent([foundIds, map]: [Set<string>, any]) {
    return (
      <Player.Context.Consumer>
        {(player: Player) => recursiveMap(this.props.children, node => {
          const attrs = {};

          if (node.props.hasOwnProperty("id")) {
            const {id} = node.props;
            foundIds.add(id);
            if (map[id] !== undefined)
              Object.assign(attrs, map[id]);
          }

          if (typeof node.type !== "string" && typeof node.type !== "symbol" && Player.ReceiverSymbol in node.type) {
            Object.assign(attrs, {player});
          }

          if (Object.keys(attrs).length === 0) {
            return node;
          } else {
            return React.cloneElement(node, attrs);
          }
        })}
      </Player.Context.Consumer>
    );
  }
}
