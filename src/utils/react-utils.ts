import {useReducer} from "react";

export function combineRefs<T>(...args: React.Ref<T>[]) {
  return (o: T) => {
    for (const ref of args) {
      if (typeof ref === "function") {
        ref(o);
      } else if (ref === null) {
      } else if (typeof ref === "object" && ref.hasOwnProperty("current")) {
        (ref as React.MutableRefObject<T>).current = o;
      }
    }
  };
}

export function useForceUpdate() {
  return useReducer((c: boolean) => !c, false)[1];
}

/**
  Helper for the https://github.com/facebook/react/issues/2043 workaround. Use to intercept refs and
  attach events.
*/
export const captureRef = <T>(callback: (ref: T) => void, innerRef?: React.Ref<T>) => (ref: T) => {
  if (ref !== null) {
    callback(ref);
  }

  if (innerRef === null) {
    return;
  } else if (typeof innerRef === "function") {
    innerRef(ref);
  } else if (typeof innerRef === "object") {
    (innerRef as React.MutableRefObject<T>).current = ref;
  }
};

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
