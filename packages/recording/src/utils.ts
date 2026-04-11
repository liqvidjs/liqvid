import { mapRecord, truncate } from "@liqvid/utils";

/**
 * Truncate numerical precision to reduce filesize.
 * @param o Data to compress.
 * @param precision Number of decimal points to include.
 */
export function compress<T>(o: T, precision = 2): T {
  switch (typeof o) {
    case "object":
      if (Array.isArray(o)) {
        return o.map((val) => compress(val, precision)) as T & unknown[];
      }
      if (o === null) {
        return o;
      }
      return mapRecord(o as Record<string, unknown>, (value) =>
        compress(value, precision),
      ) as T;
    case "number":
      return truncate(o, precision) as T & number;
    default:
      return o;
  }
}
