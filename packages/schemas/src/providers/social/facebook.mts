import { Schema } from "effect";

export const ProviderConfigFacebook = Schema.Struct({
  username: Schema.String,
});
export type ProviderConfigFacebook = (typeof ProviderConfigFacebook)["Type"];
