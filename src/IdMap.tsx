import * as React from 'react';

import Player from './Player';

import {bind} from './utils/misc';
import {recursiveMap} from './utils/react-utils';

interface Props {
  map?: object;
}

export default class IdMap extends React.PureComponent<Props, {}> {
  static Context = React.createContext();

  constructor(props: Props) {
    super(props);
    bind(this, ['renderContent']);
  }

  render() {
    if (this.props.hasOwnProperty('map')) {
      return (
        <IdMap.Context.Provider value={this.props.map}>
          {this.renderContent(this.props.map)}
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

  renderContent(map: any) {
    return (
      <Player.Context.Consumer>
        {(player: Player) => recursiveMap(this.props.children, node => {
          const attrs = {};

          if (node.props.hasOwnProperty('id')) {
            const {id} = node.props;
            if (map[id] !== undefined)
              Object.assign(attrs, map[id]);
          }

          if (typeof node.type !== 'string' && typeof node.type !== 'symbol' && Player.ReceiverSymbol in node.type) {
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
