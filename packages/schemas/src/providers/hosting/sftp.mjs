import { Schema } from "effect";
export const ProviderConfigSFTP = Schema.Struct({
    host: Schema.String,
    path: Schema.String,
});
