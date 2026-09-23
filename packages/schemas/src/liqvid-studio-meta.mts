import { Schema } from "effect";

import { SchemaProjectId } from "./branded.mts";

/** Local metadata that associates a project with its Liqvid Studio project. */
export const LiqvidStudioProjectMeta = Schema.Struct({
  $schema: Schema.String.pipe(Schema.optional),
  projectId: SchemaProjectId,
});

export type LiqvidStudioProjectMeta = (typeof LiqvidStudioProjectMeta)["Type"];
