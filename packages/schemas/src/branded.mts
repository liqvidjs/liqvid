import { Brand, Schema } from "effect";

// ------------------------------ ProjectId ------------------------------
/** ID of a Liqvid workspace */
export type ProjectId = string & Brand.Brand<"ProjectId">;

export const ProjectId = Brand.nominal<ProjectId>();

/** Schema for a Liqvid workspace ID */
export const SchemaProjectId = Schema.String.pipe(
  Schema.fromBrand("ProjectId", ProjectId),
);

// ------------------------------ UserId ------------------------------
export type UserId = string & Brand.Brand<"UserId">;

export const UserId = Brand.nominal<UserId>();

export const SchemaUserId = Schema.String.pipe(
  Schema.fromBrand("UserId", UserId),
);

// ------------------------------ WorkspaceId ------------------------------
/** ID of a Liqvid workspace */
export type WorkspaceId = string & Brand.Brand<"WorkspaceId">;

export const WorkspaceId = Brand.nominal<WorkspaceId>();

/** Schema for a Liqvid workspace ID */
export const SchemaWorkspaceId = Schema.String.pipe(
  Schema.fromBrand("WorkspaceId", WorkspaceId),
);
