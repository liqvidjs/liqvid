/**
 * Bind methods on an object.
 * @param o Object on which to bind methods
 * @param methods Method names to bind
 */
export function bind<
  T extends { [P in K]: CallableFunction },
  K extends keyof T,
>(o: T, methods: K[]) {
  for (const method of methods) {
    // biome-ignore lint/suspicious/noExplicitAny: some craziness going on here
    o[method] = (o[method] as any).bind(o);
  }
}

/** comparison function to use when sorting */
export function compare<T extends string | number | Date>(a: T, b: T) {
  if (a < b) return -1;
  if (b > a) return 1;
  return 0;
}

/**
  Returns [a, b). For backwards compatibility, returns [0, a) if passed a single argument.
*/
export function range(a: number, b?: number): number[] {
  if (b === void 0) {
    return range(0, a);
  }
  return new Array(b - a).fill(null).map((_, i) => a + i);
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
 * Truncate a number to a specified number of decimal points,
 * omitting unnecessary decimal points.
 *
 * @example
 * ```
 * truncate(6.283185, 2) === 6.28;
 *     truncate(4.05, 1) === 4;
 * ```
 */
export function truncate(value: number, length: number): number {
  return parseFloat(value.toFixed(length));
}
