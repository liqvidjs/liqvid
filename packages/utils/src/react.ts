import {Children, cloneElement, isValidElement, useMemo, useReducer, useRef} from "react";
import {anyHover} from "./interaction";

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
 * Combine multiple refs into one
 * @param args Refs to combine
 * @returns A ref which applies all the passed refs
 */
export function combineRefs<T>(...args: React.Ref<T>[]): (o: T) => void {
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
 * Drop-in replacement for onClick handlers which works better on mobile.
 * @param callback Event listener.
 * @returns Props to attach to event target.
*/
export function onClick<T extends HTMLElement | SVGElement>(
  callback: (e: React.MouseEvent<T> | (TouchEvent & {currentTarget: T})) => void
): {onClick: typeof callback} | {onTouchStart: (e: TouchEvent) => void; onTouchEnd: (e: TouchEvent) => void} {
  if (anyHover) {
    return {onClick: callback};
  } else {
    let touchId: number,
        target: T & EventTarget;

    // touchstart handler
    const onTouchStart = (e: TouchEvent): void => {
      if (typeof touchId === "number")
        return;
      target = e.currentTarget as T;
      touchId = e.changedTouches[0].identifier;
    };

    // touchend handler
    const onTouchEnd = (e: TouchEvent): void => {
      if (typeof touchId !== "number")
        return;

      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier !== touchId)
          continue;

        if (target.contains(document.elementFromPoint(touch.clientX, touch.clientY))) {
          callback(e as TouchEvent & {currentTarget: T});
        }

        touchId = undefined;
        break;
      }
    };

    return {onTouchStart, onTouchEnd};
  }
}

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

    // @ts-expect-error Not sure how to type this correctly.
    return fn(child);
  });
}

/**
 * Get a function to force the component to update
 * @returns A forceUpdate() function
 */
export function useForceUpdate(): () => void {
  return useReducer((c: number) => c+1, 0)[1];
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
