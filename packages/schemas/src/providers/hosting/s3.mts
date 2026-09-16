import { Effect, Schema } from "effect";

import { EnvVar, SchemaUrl, StringWithEnvVars } from "../../shared.mts";

/** Authentication via AWS profile */
export const S3ProfileAuth = Schema.Struct({
  profile: Schema.String,
  type: Schema.Literal("profile"),
}).pipe(Schema.annotate({ description: "Authentication via AWS profile" }));
export type S3ProfileAuth = (typeof S3ProfileAuth)["Type"];

/** Explicit S3 credentials authentication */
export const S3ExplicitAuth = Schema.Struct({
  /**
   * Access key ID. For security, can only be specified via env var.
   *
   * @default {env:AWS_ACCESS_KEY_ID}
   */
  accessKeyId: EnvVar.pipe(
    Schema.withDecodingDefault(Effect.succeed(`{env:AWS_ACCESS_KEY_ID}`)),
    Schema.RedactedFromValue,
    Schema.annotate({
      description:
        "Access key ID. For security, can only be specified via env var. Defaults to {env:AWS_ACCESS_KEY_ID}.",
    }),
  ),

  /**
   * S3-compatible endpoint URL. May contain env var interpolations.
   * E.g. `"https://{env:CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"`
   */
  endpoint: StringWithEnvVars.pipe(
    Schema.optional,
    Schema.RedactedFromValue,
    Schema.annotate({
      description:
        'S3-compatible endpoint URL. May contain env var interpolations. E.g. "https://{env:CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"',
    }),
  ),

  /**
   * AWS region
   *
   * @default us-east-1
   */
  region: Schema.String.pipe(
    Schema.withDecodingDefaultType(Effect.succeed("us-east-1")),
    Schema.annotate({ default: "us-east-1", description: "AWS region." }),
  ),

  /**
   * Secret access key. For security, can only be specified via env var.
   *
   * @default {env:AWS_SECRET_ACCESS_KEY}
   */
  secretAccessKey: EnvVar.pipe(
    Schema.withDecodingDefault(Effect.succeed(`{env:AWS_SECRET_ACCESS_KEY}`)),
    Schema.RedactedFromValue,
    Schema.annotate({
      description:
        "Secret access key. For security, can only be specified via env var. Defaults to {env:AWS_SECRET_ACCESS_KEY}.",
    }),
  ),

  type: Schema.Literal("explicit"),
}).pipe(
  Schema.annotate({ description: "Explicit S3 credentials authentication" }),
);

export type S3ExplicitAuth = (typeof S3ExplicitAuth)["Type"];

/** S3 authentication config - discriminated union */
export const S3Auth = Schema.Union([S3ProfileAuth, S3ExplicitAuth]).pipe(
  Schema.annotate({
    description: "S3 authentication config - discriminated union",
  }),
);
export type S3Auth = (typeof S3Auth)["Type"];

/** Configuration for AWS S3 (or other compatible provider) */
export const ProviderConfigS3 = Schema.Struct({
  auth: S3Auth,

  /** Bucket name */
  bucket: Schema.String.pipe(Schema.annotate({ description: "Bucket name" })),

  /**
   * Domain at which to access content. It is strongly recommended to use
   * a cache (e.g. AWS CloudFront or CloudFlare R2 Custom Domain) instead
   * of serving content directly.
   */
  domain: SchemaUrl.pipe(
    Schema.annotate({
      description:
        "Domain at which to access content. It is strongly recommended to use a cache (e.g. AWS CloudFront or CloudFlare R2 Custom Domain) instead of serving content directly.",
    }),
  ),

  /** Prefix to apply to all content from this project */
  prefix: Schema.String.pipe(
    Schema.optional,
    Schema.annotate({
      description: "Prefix to apply to all content from this project",
    }),
  ),

  region: Schema.String.pipe(Schema.optional),
}).pipe(
  Schema.annotate({
    description: "Configuration for AWS S3 (or other compatible provider)",
  }),
);
export type ProviderConfigS3 = (typeof ProviderConfigS3)["Type"];
