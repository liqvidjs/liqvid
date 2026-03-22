/** Serialized value tagged with hint about how to deserialize it */
export interface SerializedValue<DeserKey extends string = string> {
  __deser: DeserKey;
}

/** Get the list of deserializer keys necessary to deserialize a value */
export type DeserKeys<Q> =
  Q extends SerializedValue<infer H>
    ? H
    : Q extends Record<string, JSONValue>
      ? DeserKeys<Q[keyof Q]>
      : never;

/** Any valid JSON value */
export type JSONValue =
  | boolean
  | null
  | number
  | string
  | JSONValue[]
  | {
      [k: string]: JSONValue | undefined;
    };

/** Use custom JSON serialization to send an object from server to client */
export function serialize<T extends JSONValue = JSONValue>(obj: unknown): T {
  switch (typeof obj) {
    case "bigint":
    case "symbol":
    case "undefined":
      throw new Error(`cannot serialize ${typeof obj} to JSON`);
    case "boolean":
    case "number":
    case "string":
      return obj as T;
    case "function":
      if ("toJSON" in obj && typeof obj.toJSON === "function") {
        return obj.toJSON() as T;
      }
      throw new Error(`cannot serialize function ${obj.name} to JSON`);
    case "object":
      if (obj === null) {
        return obj as T;
      }
      if (Array.isArray(obj)) {
        return obj.map(serialize) as T;
      }
      if ("toJSON" in obj && typeof obj.toJSON === "function") {
        return obj.toJSON();
      }

      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, serialize(value)]),
      ) as T;
  }
}

/** Use custom JSON deserialization to revive a server-sent object on the client */
export function deserialize<In extends JSONValue>(
  obj: In,
  hydrators: Record<DeserKeys<In>, (value: unknown) => unknown>,
): unknown {
  switch (typeof obj) {
    case "boolean":
    case "number":
    case "string":
      return obj;
    case "object":
      if (obj === null) {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map((value) => deserialize(value as In, hydrators));
      }
      if ("__hydrator" in obj && typeof obj.__hydrator === "string") {
        const hydrationKey = obj.__hydrator as DeserKeys<In>;
        if (!Object.hasOwn(hydrators, hydrationKey)) {
          throw new Error(`missing hydrator: ${obj.__hydrator}`);
        }
        return hydrators[hydrationKey](obj);
      }

      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key,
          deserialize(value as In, hydrators),
        ]),
      );
  }
}
