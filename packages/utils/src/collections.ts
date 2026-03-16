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
