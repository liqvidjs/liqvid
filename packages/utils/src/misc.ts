/** Equivalent to `(min <= val) && (val < max)`. */
export function between(min: number, val: number, max: number) {
  return (min <= val) && (val < max);
}

/** Bind methods on o. */
export function bind<T extends {[P in K]: Function}, K extends keyof T>(o: T, methods: K[]) {
  for (const method of methods)
    o[method] = (o[method] as Function).bind(o);
}

/** Equivalent to `Math.min(max, Math.max(min, val))` */
export function constrain(min: number, val: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

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

/**
  Returns [a, b). For backwards compatibility, returns [0, a) if passed a single argument.
*/
export function range(a: number, b?: number): number[] {
  if (b === void 0) {
    return range(0, a);
  }
  return new Array(b - a).fill(null).map((_, i) => a+i);
};
