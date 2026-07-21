import { Schema } from "effect";

export const ProviderConfigInstagram = Schema.Struct({
  username: Schema.String,
});
export type ProviderConfigInstagram = (typeof ProviderConfigInstagram)["Type"];
