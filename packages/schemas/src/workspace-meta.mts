import { Schema } from "effect";

import { SchemaWorkspaceId } from "./branded.mts";

/** Local metadata that associates a workspace with its Liqvid Studio workspace. */
export const WorkspaceMeta = Schema.Struct({
  $schema: Schema.String.pipe(Schema.optional),
  workspaceId: SchemaWorkspaceId,
});

export type WorkspaceMeta = (typeof WorkspaceMeta)["Type"];
