import { Duration, type DurationLike } from "@liqvid/duration";

/**
 * Bind methods on an object. Type safety is enforced, so note that
 * TypeScript will complain about this on private methods.
 */
export function bind<
  T extends { [P in K]: CallableFunction },
  K extends keyof T,
>(
  /** Object on which to bind methods */
  o: T,

  /** Method names to bind */
  methods: K[],
) {
  for (const method of methods) {
    // biome-ignore lint/suspicious/noExplicitAny: some craziness going on here
    o[method] = (o[method] as any).bind(o);
  }
}

/**
 * Comparison function to use when sorting. Returns -1 if a &lt; b, 1 if a &gt; b, and 0 otherwise.
 */
export function compare<T extends string | number | Date>(a: T, b: T) {
  if (a < b) return -1;
  if (b > a) return 1;
  return 0;
}

/**
 * Given a template string with string placeholders, creates a function
 * accepting those placeholders as named arguments.
 *
 * @example
 * ```ts
 * const template = namedSlotsTemplate`Hello, ${"name"}!`;`
 *
 * template({ name: "World" }); // "Hello, World!"
 * ```
 */
export function namedSlotsTemplate<Args extends string[]>(
  strings: TemplateStringsArray,
  ...keys: Args
) {
  return (values: Record<Args[number], unknown>): string => {
    let result = strings[0];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i] as Args[number];
      result += values[key];
      result += strings[i + 1];
    }

    return result;
  };
}

/**
 * Returns the array `[a, ..., b-1]`. For backwards compatibility, returns `[0, ..., a-1]` if passed a single argument.
 * @example
 * ```ts
 * range(2, 5); // [2, 3, 4]
 * range(5); // [0, 1, 2, 3, 4]
 * ```
 */
export function range(a: number, b?: number): number[] {
  if (b === void 0) {
    return range(0, a);
  }
  return new Array(b - a).fill(null).map((_, i) => a + i);
}

/**
 * Truncate a number to a specified number of decimal points,
 * omitting unnecessary decimal points.
 *
 * @example
 * ```ts
 * truncate(6.283185, 2); // 6.28
 * truncate(4.05, 1); // 4
 * ```
 */
export function truncate(value: number, length: number): number {
  return parseFloat(value.toFixed(length));
}

/** Returns a Promise that resolves after the specified time. */
export function wait(
  /**
   * Duration to wait for. For backwards compatibility, passing a number will
   * be treated as milliseconds; however, passing a DurationLike is recommended.
   */
  time: DurationLike | number,
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(
      resolve,
      typeof time === "number" ? time : Duration.from(time).inMilliseconds(),
    );
  });
}

/** Returns a Promise that resolves once `callback` returns true. */
export function waitFor(
  callback: () => boolean,
  interval: DurationLike | number = 10,
): Promise<void> {
  return new Promise((resolve) => {
    const checkCondition = () => {
      if (callback()) {
        resolve();
      } else {
        setTimeout(
          checkCondition,
          typeof interval === "number"
            ? interval
            : Duration.from(interval).inMilliseconds(),
        );
      }
    };

    checkCondition();
  });
}
