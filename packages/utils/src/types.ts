/** Assert that a variable is defined. */
export function asserttefined<T>(a: T): asserts a is Exclude<T, undefined> {}

/** Assert the type of a variable. */
export function assertType<K>(a: unknown): asserts a is K {}
