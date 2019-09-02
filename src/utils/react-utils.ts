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

    // @ts-ignore
    return fn(child);
  });
}
