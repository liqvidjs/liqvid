import { Effect, Schema } from "effect";

import { decodeEnvVar } from "./env-vars.mts";

/* ------------------------------ color scheme ------------------------------ */
export const ColorScheme = Schema.Literals(["light", "dark"]);

export const ColorSchemeInputSpecifier = Schema.Union([
  ColorScheme,
  Schema.Literal("both"),
]);

export type ColorSchemeInputSpecifier =
  (typeof ColorSchemeInputSpecifier)["Type"];

/** Reference an environment variable (exact match: `{env:VAR_NAME}`) */
export const EnvVar = Schema.TemplateLiteral([
  "{env:",
  Schema.String,
  "}",
]).pipe(decodeEnvVar);
export type EnvVar = (typeof EnvVar)["Encoded"];

/** Recognized image formats. */
export const ImageFormat = Schema.Literals(["jpeg", "png"]);

export type ImageFormat = (typeof ImageFormat)["Type"];

/** Quality parameter for JPEG images, from 1 to 100. Defaults to 80. */
export const JpegQuality = Schema.Number.pipe(
  Schema.withDecodingDefaultType(Effect.succeed(80)),
);

/**
 * A string that may contain embedded environment variable references.
 * E.g. `"https://{env:ACCOUNT_ID}.example.com"`
 *
 * At runtime, all `{env:VAR_NAME}` patterns will be replaced with the
 * corresponding environment variable values.
 */
export const StringWithEnvVars = Schema.String.pipe(
  Schema.brand("StringWithEnvVars"),
  decodeEnvVar,
);
export type StringWithEnvVars = (typeof StringWithEnvVars)["Type"];
