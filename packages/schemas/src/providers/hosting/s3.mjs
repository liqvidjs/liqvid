import { Effect, Schema } from "effect";
import { EnvVar, StringWithEnvVars } from "../../shared.mts";
/** Authentication via AWS profile */
export const S3ProfileAuth = Schema.Struct({
    profile: Schema.String,
    type: Schema.Literal("profile"),
});
/** Explicit S3 credentials authentication */
export const S3ExplicitAuth = Schema.Struct({
    /**
     * Access key ID. For security, can only be specified via env var.
     *
     * @default {env:AWS_ACCESS_KEY_ID}
     */
    accessKeyId: EnvVar.pipe(Schema.withDecodingDefault(Effect.succeed(`{env:AWS_ACCESS_KEY_ID}`)), Schema.RedactedFromValue),
    /**
     * S3-compatible endpoint URL. May contain env var interpolations.
     * E.g. `"https://{env:CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"`
     */
    endpoint: StringWithEnvVars.pipe(Schema.optional, Schema.RedactedFromValue),
    /**
     * AWS region
     *
     * @default us-east-1
     */
    region: Schema.String.pipe(Schema.withDecodingDefaultType(Effect.succeed("us-east-1"))),
    /**
     * Secret access key. For security, can only be specified via env var.
     *
     * @default {env:AWS_SECRET_ACCESS_KEY}
     */
    secretAccessKey: EnvVar.pipe(Schema.withDecodingDefault(Effect.succeed(`{env:AWS_SECRET_ACCESS_KEY}`)), Schema.RedactedFromValue),
    type: Schema.Literal("explicit"),
});
/** S3 authentication config - discriminated union */
export const S3Auth = Schema.Union([S3ProfileAuth, S3ExplicitAuth]);
/** Configuration for AWS S3 (or other compatible provider) */
export const ProviderConfigS3 = Schema.Struct({
    auth: S3Auth,
    /** Bucket name */
    bucket: Schema.String,
    /**
     * Domain at which to access content. It is strongly recommended to use
     * a cache (e.g. AWS CloudFront or CloudFlare R2 Custom Domain) instead
     * of serving content directly.
     */
    domain: Schema.String,
    /** Prefix to apply to all content from this project */
    prefix: Schema.String.pipe(Schema.optional),
    region: Schema.String.pipe(Schema.optional),
});
