import { Schema } from "effect";

import { StringWithEnvVars } from "../../shared.mts";

export const ProviderConfigLiqvidStudio = Schema.Struct({
  /** Access token obtained from https://liqvid.studio/settings/tokens */
  accessToken: StringWithEnvVars.pipe(
    Schema.RedactedFromValue,
    Schema.annotate({
      description:
        "Access token obtained from https://liqvid.studio/settings/tokens",
    }),
  ),

  /** your Liqvid Studio username */
  username: Schema.String.pipe(
    Schema.annotate({
      description: "Your Liqvid Studio username.",
    }),
  ),

  workspace: StringWithEnvVars.pipe(
    Schema.optional,
    Schema.annotate({
      description:
        "Name of this project, used to scope your content on Liqvid Studio.\nIf not set, defaults to `name` from `package.json`.\nMUST be set if the package.json `name` contains a slash.",
    }),
  ),
});
export type ProviderConfigLiqvidStudio =
  (typeof ProviderConfigLiqvidStudio)["Type"];
