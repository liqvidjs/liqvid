/** biome-ignore-all lint/suspicious/noExplicitAny: lots of type magic in this file */

/** Use custom JSON serialization to send an object from server to client */
export function serialize<T>(obj: T): SerializationResult<T> {
  switch (typeof obj) {
    case "bigint":
    case "symbol":
    case "undefined":
      throw new Error(`cannot serialize ${typeof obj} to JSON`);
    case "boolean":
    case "number":
    case "string":
      return obj as any;
    case "function":
      if ("toJSON" in obj && typeof obj.toJSON === "function") {
        return obj.toJSON() as any;
      }
      throw new Error(`cannot serialize function ${obj.name} to JSON`);
    case "object":
      if (obj === null) {
        return obj as any;
      }
      if (Array.isArray(obj)) {
        return obj.map(serialize) as unknown as any;
      }
      if ("toJSON" in obj && typeof obj.toJSON === "function") {
        return obj.toJSON() as any;
      }

      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, serialize(value)]),
      ) as any;
    default:
      throw new Error("unknown value");
  }
}

/** Get the result of serializing a value */
type SerializationResult<T> = T extends { toJSON(): infer S }
  ? S
  : T extends ReadonlyArray<any> & { [extra: string | symbol]: any }
    ? { [key in keyof T]: SerializationResult<T[key]> }
    : // put this here first to handle branded strings
      T extends bigint | boolean | number | string | null
      ? T
      : T extends Record<string, any>
        ? {
            [k in keyof T]: SerializationResult<T[k]>;
          }
        : T;
