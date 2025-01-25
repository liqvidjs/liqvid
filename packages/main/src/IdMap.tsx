import * as React from "react";

import {bind} from "@liqvid/utils/misc";
import {recursiveMap} from "@liqvid/utils/react";

interface Props {
  children?: React.ReactNode;
  map?: Record<string, unknown>;
}

/**
 * This class gives a way to automagically attach data loaded from a file as attributes on elements.
 * This is provided to facilitate the development of—and provide a standard interface for—GUI tools.
 */
export class IdMap extends React.PureComponent<Props> {
  static Context = React.createContext([]);

  /** IDs found within the IdMap */
  foundIds: Set<string>;

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
        <IdMap.Context.Consumer>{this.renderContent}</IdMap.Context.Consumer>
      );
    }
  }

  renderContent([foundIds, map]: [Set<string>, unknown]) {
    return recursiveMap(this.props.children, (node) => {
      const attrs = {};

      if (node.props.hasOwnProperty("id")) {
        const {id} = (node as React.ReactElement<{id: string}>).props;
        foundIds.add(id);
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        if ((map as any)[id] !== undefined)
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          Object.assign(attrs, (map as any)[id]);
      }

      if (Object.keys(attrs).length === 0) {
        return node;
      } else {
        return React.cloneElement(node, attrs);
      }
    });
  }
}
