import { Schema } from "effect";

export const ProviderConfigTwitter = Schema.Struct({
  username: Schema.String,
});
export type ProviderConfigTwitter = (typeof ProviderConfigTwitter)["Type"];
