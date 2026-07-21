import { Schema } from "effect";

export const ProviderConfigSFTP = Schema.Struct({
  host: Schema.String,
  path: Schema.String,
});
export type ProviderConfigSFTP = (typeof ProviderConfigSFTP)["Type"];
