import { Schema } from "effect";

export const ProviderConfigBlueSky = Schema.Struct({
  username: Schema.String,
});
export type ProviderConfigBlueSky = (typeof ProviderConfigBlueSky)["Type"];
