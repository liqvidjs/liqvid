import {
  Context,
  Data,
  Effect,
  Schema,
  SchemaIssue,
  SchemaTransformation,
} from "effect";

// Declaring a tag for a service that generates random numbers
export const EnvFiles = Context.Service<{
  readonly production: Record<string, string>;
  readonly local: Record<string, string>;
  readonly development: Record<string, string>;
}>("EnvFiles");

export type EnvFiles = (typeof EnvFiles)["Service"];

class EnvVarError extends Data.TaggedError("EnvVarError")<{
  message: string;
  string: string;
}> {
  override toString() {
    return (
      "Failed to interpolate environment variables: " +
      JSON.stringify(
        {
          message: this.message,
          string: this.string,
        },
        null,
        2,
      )
    );
  }
}

/**
 * Interpolate environment variable placeholders in a string.
 * Supports:
 *   - {env:VAR_NAME} - reads from process.env
 *   - {env:production:VAR_NAME} - reads from .env.production
 *   - {env:development:VAR_NAME} - reads from .env.development
 */
export const interpolateEnvVars = Effect.fnUntraced(function* (str: string) {
  const envFiles = yield* Effect.service(EnvFiles);

  return yield* Effect.try({
    catch: (e) =>
      new EnvVarError({
        message: (e as Error).message,
        string: str,
      }),
    try: () =>
      str.replace(/\{env:([^}]+)\}/g, (_match: string, content: string) => {
        const parts = content.split(":");

        if (parts.length === 1) {
          // {env:VAR_NAME} - use process.env
          const varName = parts[0]!;
          const value = process.env[varName];
          if (value === undefined) {
            throw new Error(`Environment variable ${varName} is not set`);
          }
          return value;
        } else if (parts.length === 2) {
          // {env:environment:VAR_NAME}
          const [environment, varName] = parts as [string, string];

          if (environment === "production") {
            const value = envFiles.production[varName] ?? process.env[varName];
            if (value === undefined) {
              throw new Error(
                `Environment variable ${varName} is not set in .env.production or process.env`,
              );
            }
            return value;
          } else if (environment === "development") {
            const value = envFiles.development[varName] ?? process.env[varName];
            if (value === undefined) {
              throw new Error(
                `Environment variable ${varName} is not set in .env.development or process.env`,
              );
            }
            return value;
          } else {
            throw new Error(
              `Invalid environment "${environment}" in placeholder. Use "production" or "development".`,
            );
          }
        } else {
          throw new Error(
            `Invalid environment variable placeholder: {env:${content}}`,
          );
        }
      }),
  });
});

export const decodeEnvVar = Schema.decodeTo(
  Schema.String,
  SchemaTransformation.transformOrFail({
    decode: (s: unknown) => {
      return interpolateEnvVars(s as string).pipe(
        Effect.mapError(
          (e) => new SchemaIssue.InvalidValue({ message: e.toString() }, s),
        ),
      );
    },
    encode: (s) =>
      Effect.fail(
        new SchemaIssue.Forbidden(
          {
            message:
              "Encoding hashed passwords back to plain text is forbidden.",
          },
          s,
        ),
      ),
  }),
);
