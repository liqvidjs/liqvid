/** biome-ignore-all lint/suspicious/noExplicitAny: lots of type magic in this file */

/**
 * Use custom JSON deserialization to revive a server-sent object on the client
 */
export function deserialize<
  In extends JSONValue,
  DeserMap extends Record<DeserKeys<In>, (value: any) => unknown>,
>(
  obj: In,

  deserializers: DeserMap = {} as DeserMap,
): DeserializedValue<In, DeserMap> {
  switch (typeof obj) {
    case "boolean":
    case "number":
    case "string":
      return obj as any;
    case "object":
      if (obj === null) {
        return obj as any;
      }

      if (Array.isArray(obj)) {
        return obj.map((value) =>
          deserialize(value as In, deserializers),
        ) as any;
      }

      if ("__deser" in obj && typeof obj.__deser === "string") {
        if (
          obj.__deser === "Date" &&
          "iso" in obj &&
          typeof obj.iso === "string"
        ) {
          return new Date(obj.iso) as any;
        }

        const hydrationKey = obj.__deser as DeserKeys<In>;
        if (!Object.hasOwn(deserializers, hydrationKey)) {
          throw new Error(`missing deserializer: ${obj.__deser}`);
        }
        return deserializers[hydrationKey](obj) as any;
      }

      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key,
          deserialize(value as In, deserializers) as any,
        ]),
      ) as any;
  }
}

/* ------------------------------ types ------------------------------ */

/** Serialized value tagged with hint about how to deserialize it */
export type SerializedValue<DeserKey extends string = string> = {
  readonly __deser: DeserKey;
};

export type SerializedDate = SerializedValue<"Date"> & { readonly iso: string };

/** Any valid JSON value */
export type JSONValue =
  | boolean
  | null
  | number
  | string
  | readonly JSONValue[]
  | { readonly [key: string]: JSONValue };

/** Get the list of deserializer keys necessary to deserialize a value */
export type DeserKeys<T extends JSONValue> =
  T extends SerializedValue<infer DK>
    ? DK
    : T extends ReadonlyArray<JSONValue>
      ? { [k in number & keyof T]: DeserKeys<T[k]> }[number & keyof T]
      : T extends Record<string, JSONValue>
        ? { [k in keyof T]: DeserKeys<T[k]> }[keyof T & string]
        : never;

/**
 * Get the result of deserializing an input value
 */
export type DeserializedValue<
  In extends JSONValue,
  DeserMap extends Record<string, (value: unknown) => unknown>,
  MaxDepth extends number = 5,
  LimitDepth extends unknown[] = [],
> = LimitDepth["length"] extends MaxDepth
  ? any
  : In extends SerializedDate
    ? Date
    : In extends SerializedValue<infer DK extends string & keyof DeserMap>
      ? ReturnType<DeserMap[DK]>
      : In extends ReadonlyArray<JSONValue> & { [key in string | symbol]: any }
        ? {
            [index in keyof In]: DeserializedValue<
              In[index],
              DeserMap,
              MaxDepth,
              [...LimitDepth, any]
            >;
          }
        : In extends Record<string, JSONValue>
          ? {
              [key in keyof In]: DeserializedValue<
                In[key],
                DeserMap,
                MaxDepth,
                [...LimitDepth, any]
              >;
            }
          : unknown extends In
            ? unknown
            : In;
