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
