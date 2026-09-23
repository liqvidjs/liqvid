import { Schema } from "effect";

import { SchemaProjectId } from "./branded.mts";
import { Parametrized } from "./project.mts";

/** Local metadata that associates a project with its Liqvid Studio project. */
export const LiqvidStudioProjectMeta = Schema.Struct({
  $schema: Schema.String.pipe(Schema.optional),
  projectId: Parametrized(SchemaProjectId),
});

export type LiqvidStudioProjectMeta = (typeof LiqvidStudioProjectMeta)["Type"];
