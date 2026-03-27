import { z } from "zod";

/** Reference an environment variable (exact match: `{env:VAR_NAME}`) */
export const EnvVar = z.templateLiteral(["{env:", z.string(), "}"]);
export type EnvVar = z.infer<typeof EnvVar>;

/**
 * A string that may contain embedded environment variable references.
 * E.g. `"https://{env:ACCOUNT_ID}.example.com"`
 *
 * At runtime, all `{env:VAR_NAME}` patterns will be replaced with the
 * corresponding environment variable values.
 */
export const StringWithEnvVars = z.string();
export type StringWithEnvVars = z.infer<typeof StringWithEnvVars>;
