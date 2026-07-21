import { Schema } from "effect";

export const ProviderConfigLiqvidStudio = Schema.Struct({
  username: Schema.String,
});
export type ProviderConfigLiqvidStudio =
  (typeof ProviderConfigLiqvidStudio)["Type"];
