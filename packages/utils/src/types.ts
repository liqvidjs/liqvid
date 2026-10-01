/** Assert that a variable is defined. */
export function assertDefined<T>(a: T): asserts a is Exclude<T, undefined> {}

/** Assert the type of a variable. */
export function assertType<K>(a: unknown): asserts a is K {}

/**
 * Function that performs cleanup, such as removing event listeners or other
 * subscriptions. This is the return type of setup functions.
 *
 * This is a nominal type for legibility. Note that this is not appropriate
 * for every instance of the type `() => void`; for example, `toggleOpen()`
 * would have the same signature, but is not a cleanup function.
 */
export type CleanUpFn = () => void;

/**
 * Either a value of type `T` or a promise that resolves to a value of type `T`.
 */
export type Awaitable<T> = T | Promise<T>;

const createIdentity =
  /* @__PURE__ */
    () =>
    <T>(x: T): Readonly<T> =>
      x;

/** Mark a value as readonly. This is a no-op at runtime. */
export const readonly = createIdentity();

/** Prevent TypeScript from inferring a type. */
export type PreventInference<T> = [T][T extends unknown ? 0 : never];

/** Remove the `readonly` modifier from all properties of a type. */
export type Mutable<T, K extends keyof T = keyof T> = {
  -readonly [P in K]: T[P];
} & {
  [P in Exclude<keyof T, K>]: T[P];
};
