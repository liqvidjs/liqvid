export function filterRecord<
  T extends Record<string, unknown>,
  F extends (value: T[keyof T], key: keyof T) => boolean,
>(record: T, fn: F): T {
  return Object.fromEntries(
    (Object.keys(record) as (keyof T)[])
      .filter((key) => fn(record[key], key))
      .map((key) => [key, record[key]]),
  ) as T;
}

export function mapRecord<
  T extends Record<string, unknown>,
  F extends (value: T[keyof T], key: keyof T) => unknown,
>(record: T, fn: F): { [K in keyof T]: ReturnType<F> } {
  return Object.fromEntries(
    (Object.keys(record) as (keyof T)[]).map((key) => [
      key,
      fn(record[key], key),
    ]),
  ) as { [K in keyof T]: ReturnType<F> };
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
