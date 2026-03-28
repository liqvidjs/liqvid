import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { type PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
import { Upload } from "@aws-sdk/lib-storage";
import type { ProviderConfigS3 } from "@liqvid/schemas/providers";

import type { MediaHostingProvider } from "../types.mts";

/**
 * Resolve an environment variable reference to its actual value.
 * Matches exact env var references like `{env:VAR_NAME}`.
 */
function resolveEnvVar(envVar: string): string {
  const match = envVar.match(/^\{env:(.+)\}$/);
  if (!match) {
    throw new Error(`Invalid environment variable reference: ${envVar}`);
  }
  const varName = match[1];
  const value = process.env[varName];
  if (value === undefined) {
    throw new Error(`Environment variable ${varName} is not set`);
  }
  return value;
}

/**
 * Interpolate all environment variable references in a string.
 * Replaces all `{env:VAR_NAME}` patterns with their values.
 */
function interpolateEnvVars(str: string): string {
  return str.replace(/\{env:([^}]+)\}/g, (match, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      throw new Error(`Environment variable ${varName} is not set`);
    }
    return value;
  });
}

/** Content type mapping for common media files */
const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css",
  ".gif": "image/gif",

  // HTML/CSS/JS
  ".html": "text/html",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript",

  // Data
  ".json": "application/json",
  ".m4a": "audio/mp4",
  ".mjs": "application/javascript",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",

  // Audio
  ".mp3": "audio/mpeg",

  // Video
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",

  // Images
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".weba": "audio/webm",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".xml": "application/xml",
};

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/** AWS S3, or other compatible provider */
export class S3Provider implements MediaHostingProvider {
  private client: S3Client;
  private bucket: string;
  private prefix: string;
  private config: ProviderConfigS3;

  constructor(config: ProviderConfigS3) {
    this.config = config;
    this.bucket = config.bucket;
    this.prefix = config.prefix ?? "";
    this.client = this.createClient();
  }

  private createClient(): S3Client {
    const { auth, region } = this.config;

    // Discriminated union on auth.type
    switch (auth.type) {
      case "profile": {
        // AWS profile-based authentication
        return new S3Client({
          credentials: fromIni({ profile: auth.profile }),
          region: region ?? "us-east-1",
        });
      }

      case "explicit": {
        // Explicit credentials (accessKeyId/secretAccessKey)
        // This is the path used for S3-compatible providers like Cloudflare R2
        const accessKeyId = resolveEnvVar(auth.accessKeyId);
        const secretAccessKey = resolveEnvVar(auth.secretAccessKey);

        // Handle endpoint with env var interpolation (e.g., for Cloudflare R2)
        const endpoint = auth.endpoint
          ? interpolateEnvVars(auth.endpoint)
          : undefined;

        // When using a custom endpoint (like R2), region must be "auto"
        // See: https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
        return new S3Client({
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
          endpoint,
          region: endpoint ? "auto" : (auth.region ?? region ?? "us-east-1"),
        });
      }
    }
  }

  getBaseUrl(): string {
    return `${this.config.domain}/${this.config.prefix ?? ""}`;
  }

  async publishMedia(files: string[], rootDir: string): Promise<void> {
    if (files.length === 0) {
      console.log("No media files to upload.");
      return;
    }

    console.log(`Uploading ${files.length} files to s3://${this.bucket}...`);

    for (const filePath of files) {
      // Compute relative path from project root (e.g., "projects/foo/video.mp4")
      const relativeFromRoot = path.relative(rootDir, filePath);
      const key = this.buildKey(relativeFromRoot);
      await this.uploadFile(filePath, key);
    }

    console.log(`Upload complete.`);
  }

  /**
   * Build the S3 key for a file
   */
  private buildKey(relativePath: string): string {
    const parts: string[] = [];

    if (this.prefix) {
      parts.push(this.prefix);
    }

    parts.push(relativePath);

    // Normalize path separators to forward slashes for S3
    return parts.join("/").replace(/\\/g, "/");
  }

  /**
   * Upload a single file to S3 using multipart upload for large files
   */
  private async uploadFile(filePath: string, key: string): Promise<void> {
    const fileContent = await fsp.readFile(filePath);
    const contentType = getContentType(filePath);

    const params: PutObjectCommandInput = {
      Body: fileContent,
      Bucket: this.bucket,
      ContentType: contentType,
      Key: key,
    };

    // Use multipart upload for better reliability
    const upload = new Upload({
      client: this.client,
      params,
    });

    await upload.done();
    console.log(`  Uploaded: ${key}`);
  }
}
