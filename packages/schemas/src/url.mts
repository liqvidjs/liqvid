const SCHEMAS_HOST = "https://liqvidjs.org";

export function schemaUrl<
  const F extends string,
  const V extends string = "latest",
>(filename: F, version: V = "latest" as const as V) {
  return `${SCHEMAS_HOST}/schemas/${version}/${filename}` as const;
}

export const $SchemaFilename = Symbol.for("@liqvid/schemas/$schema.filename");
export const $SchemaVersion = Symbol.for("@liqvid/schemas/$schema.version");

declare module "effect/Schema" {
  export namespace Annotations {
    export interface Annotations {
      readonly [$SchemaFilename]?: string;
      readonly [$SchemaVersion]?: string;
    }
  }
}
