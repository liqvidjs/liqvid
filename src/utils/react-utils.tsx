import * as React from "react";

export function recursiveMap(
  children: React.ReactNode,
  fn: (child: React.ReactElement<any>) => React.ReactElement<any>
): React.ReactChild[] {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement<any>(child)) {
      return child;
    }

    if ("children" in child.props) {
      child = React.cloneElement(child, {
        children: recursiveMap(child.props.children, fn)
      });
    }

    return fn(child);
  });
}

// XXX figure out how to type this
export function createContextBroadcaster
<C>
(Context: React.Context<C>, ReceiverSymbol: symbol, name: string): any
{
  return class extends React.PureComponent {
    render() {
      return (
        <Context.Consumer>
          {context => recursiveMap(this.props.children, node => {
            if (typeof node.type === "string")
              return node;

            else if (!(ReceiverSymbol in node.type))
              return node;

            const replacement = React.cloneElement(node, {[name]: context});
            return replacement;
          })}
        </Context.Consumer>
      );
    }
  };
}
