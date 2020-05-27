/** Bind methods on o. */
export function bind<T extends {[P in K]: Function}, K extends keyof T>(o: T, methods: K[]) {
  for (const method of methods)
    o[method] = (o[method] as Function).bind(o);
}

/**
  Helper for the https://github.com/facebook/react/issues/2043 workaround. Use to intercept refs and
  attach events.
*/
export const captureRef = <T>(callback: (ref: T) => void, innerRef?: React.Ref<T>) => (ref: T) => {
  if (ref !== null) {
    callback(ref);
  }

  if (typeof innerRef === "function") {
    innerRef(ref);
  } else if (typeof innerRef === "object") {
    (innerRef as React.MutableRefObject<T>).current = ref;
  }
};

/** Returns a Promise that resolves in `time` milliseconds. */
export function wait(time: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

/** Returns a Promise that resolves once `callback` returns true. */
export function waitFor(callback: () => boolean, interval = 10): Promise<void> {
  return new Promise((resolve) => {
    const checkCondition = () => {
      if (callback()) {
        resolve();
      } else {
        setTimeout(checkCondition, interval);
      }
    };

    checkCondition();
  });
}

/** Returns [0, ..., n-1] */
export function range(n: number) {
  return new Array(n).fill(null).map((_, i) => i);
};

/** Equivalent to `Math.min(max, Math.max(min, val))` */
export function constrain(min: number, val: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

/** Equivalent to `(min <= val) && (val < max)`. */
export function between(min: number, val: number, max: number) {
  return (min <= val) && (val < max);
}
