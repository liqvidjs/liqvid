/**
 * Filter a record by a predicate function.
 */
export function filterRecord<
  T extends Record<string, unknown>,
  F extends (value: T[keyof T], key: keyof T) => boolean,
>(
  /** The record to filter. */
  record: T,

  /** The predicate function to filter by. */
  fn: F,
): T {
  return (Object.keys(record) as (keyof T)[]).reduce((acc, key) => {
    if (fn(record[key], key)) {
      acc[key] = record[key];
    }

    return acc;
  }, {} as T);
}

/**
 * Map a record by a mapping function.
 */
export function mapRecord<
  T extends Record<string, unknown>,
  F extends (value: T[keyof T], key: keyof T) => unknown,
>(
  /** The record to map. */
  record: T,

  /** The mapping function to map by. */
  fn: F,
): { [K in keyof T]: ReturnType<F> } {
  return (Object.keys(record) as (keyof T)[]).reduce(
    (acc, key) => {
      acc[key] = fn(record[key], key) as ReturnType<F>;
      return acc;
    },
    {} as { [K in keyof T]: ReturnType<F> },
  );
}

/**
 * Omit certain fields from an object.
 * @param obj Object to omit fields from.
 * @param keys Keys to omit.
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  ...keys: (K | K[])[]
): Omit<T, K> {
  keys = keys.flat() as K[];
  return Object.fromEntries(
    (Object.keys(obj) as (keyof T)[])
      .filter((key) => !(keys as (keyof T)[]).includes(key))
      .map((key) => [key, obj[key]]),
  ) as Omit<T, K>;
}

/**
 * Pick certain fields from an object.
 * @param obj Object to pick fields from.
 * @param keys Keys to pick.
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  ...keys: (K | K[])[]
): Pick<T, K> {
  keys = keys.flat() as K[];
  return Object.fromEntries(
    (Object.keys(obj) as (keyof T)[])
      .filter((key) => (keys as (keyof T)[]).includes(key))
      .map((key) => [key, obj[key]]),
  ) as Pick<T, K>;
}

/**
 * Polyfill for upcoming `Promise.allKeyed`
 */
export async function promiseAllKeyed<
  T extends Record<string, Promise<unknown>>,
>(obj: T): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const values = await Promise.all(Object.values(obj));
  const keys = Object.keys(obj) as (keyof T)[];
  return keys.reduce(
    (acc, key, index) => {
      acc[key] = values[index] as Awaited<T[typeof key]>;
      return acc;
    },
    {} as {
      [K in keyof T]: Awaited<T[K]>;
    },
  );
}
