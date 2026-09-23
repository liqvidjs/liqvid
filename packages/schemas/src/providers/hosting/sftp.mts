import { Schema } from "effect";

import { SchemaUrl, StringWithEnvVars } from "../../shared.mts";

export const ProviderConfigSFTP = Schema.Struct({
  /**
   * Base path that content is hosted under. Should match the basePath in your framework configuration.
   */
  basePath: StringWithEnvVars.pipe(
    Schema.optional,
    Schema.annotate({
      description:
        "Base path that content is hosted under. Should match the basePath in your framework configuration.",
    }),
  ),

  /**
   * Domain content will be hosted at.
   * Currently, this is only used for the "copy embed code" button.
   */
  domain: SchemaUrl.pipe(
    Schema.optional,
    Schema.annotate({
      description:
        'Domain content will be hosted at. Currently, this is only used for the "copy embed code" button.',
    }),
  ),

  host: Schema.String,
  path: Schema.String,
});
export type ProviderConfigSFTP = (typeof ProviderConfigSFTP)["Type"];
