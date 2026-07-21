import { Schema } from "effect";

export const ProviderConfigGitHubPages = Schema.Struct({
  repository: Schema.String,
  root: Schema.Boolean.pipe(Schema.optional),
  username: Schema.String,
});
export type ProviderConfigGitHubPages =
  (typeof ProviderConfigGitHubPages)["Type"];
