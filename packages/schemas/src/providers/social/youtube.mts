import { Schema } from "effect";

export const ProviderConfigYouTube = Schema.Struct({
  username: Schema.String,
});
export type ProviderConfigYouTube = (typeof ProviderConfigYouTube)["Type"];
