import { Schema } from "effect";

import { $SchemaFilename, schemaUrl } from "./url.mts";

/** template.json files used to create new projects */
export const TemplateJson = Schema.Struct({
  $schema: Schema.Literals([schemaUrl("template.json")]).pipe(Schema.optional),

  default: Schema.Boolean.pipe(Schema.optional),

  name: Schema.String,
}).annotate({
  [$SchemaFilename]: "template.json",
});
export type TemplateJson = (typeof TemplateJson)["Type"];
