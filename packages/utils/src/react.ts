import {Children, cloneElement, isValidElement, useMemo, useReducer, useRef} from "react";

/**
 * Combine multiple refs into one
 * @param args Refs to combine
 * @returns A ref which applies all the passed refs
 */
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

/**
 * Get a function to force the component to update
 * @returns A forceUpdate() function
 */
export function useForceUpdate(): () => void {
  return useReducer((c: number) => c+1, 0)[1];
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

/**
 * Recursive version of {@link React.Children.map}
 * @param children Children to iterate over
 * @param fn Callback function
 * @returns Transformed nodes
 */
export function recursiveMap(
  children: React.ReactNode,
  fn: (child: React.ReactElement<unknown>) => React.ReactElement<unknown>
): React.ReactNode[] {
  return Children.map(children, (child) => {
    if (!isValidElement<unknown>(child)) {
      return child;
    }

    if ("children" in child.props) {
      child = cloneElement(child, {
        children: recursiveMap(child.props.children, fn)
      });
    }

    // @ts-ignore
    return fn(child);
  });
}

/**
 * Get a promise and resolver
 * @param deps React dependency list
 * @returns [promise, resolve, reject]
 */
export function usePromise(deps: React.DependencyList = []): [Promise<void>, () => void, () => void] {
  const resolve = useRef<() => void>();
  const reject = useRef<() => void>();

  const promise = useMemo(() => new Promise<void>((res, rej) => {
    resolve.current = res;
    reject.current = rej;
  }), deps);

  return [promise, resolve.current, reject.current];
}
