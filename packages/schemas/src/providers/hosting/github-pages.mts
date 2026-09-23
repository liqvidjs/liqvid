import { Effect, Schema } from "effect";

export const ProviderConfigGitHubPages = Schema.Struct({
  /** Branch to publish to */
  branch: Schema.String.pipe(
    Schema.withDecodingDefaultType(Effect.succeed("gh-pages")),
    Schema.annotate({ description: "Branch to publish to" }),
  ),

  /** Name of the repository to publish to */
  repository: Schema.String.pipe(
    Schema.annotate({ description: "Name of the repository to publish to" }),
  ),

  /** Your GitHub username */
  username: Schema.String.pipe(
    Schema.annotate({ description: "Your GitHub username" }),
  ),
});

export type ProviderConfigGitHubPages =
  (typeof ProviderConfigGitHubPages)["Type"];
