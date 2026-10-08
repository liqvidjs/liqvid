import * as fsp from "node:fs/promises";
import * as path from "node:path";

import {
  GetObjectCommand,
  ListObjectsV2Command,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
import { Upload } from "@aws-sdk/lib-storage";
import type { ProviderConfigS3 } from "@liqvid/schemas";
import { Effect, FileSystem, Option, Redacted } from "effect";
import {
  type AbsoluteDir,
  type AbsoluteFile,
  RelativeFile,
} from "effect-paths";

import { readDirWithFileTypes } from "#_/utils/effect.mjs";

import type {
  FileDownloadStatus,
  HostingProvider,
  MediaHostingProvider,
  RemoteFileInfo,
} from "../types.mts";

const CHECK_CONCURRENCY = 50;
const DOWNLOAD_CONCURRENCY = 5;
const UPLOAD_CONCURRENCY = 5;

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
export class S3Provider implements HostingProvider, MediaHostingProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly config: ProviderConfigS3;

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

        // un-redact values
        const accessKeyId = Redacted.value(auth.accessKeyId);
        const secretAccessKey = Redacted.value(auth.secretAccessKey);
        const endpoint = Redacted.value(auth.endpoint);

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

  checkFiles(files: readonly AbsoluteFile[], rootDir: AbsoluteDir) {
    return Effect.gen({ self: this }, function* () {
      const remoteFiles = yield* this.listRemoteFiles();
      const remoteByKey = new Map(remoteFiles.map((file) => [file.key, file]));
      const fs = yield* FileSystem.FileSystem;

      return yield* Effect.all(
        files.map((filePath) =>
          Effect.gen({ self: this }, function* (this: S3Provider) {
            const relativePath = RelativeFile(
              path.relative(rootDir, filePath).replace(/\\/g, "/"),
            );
            const key = this.buildKey(relativePath);
            const remote = remoteByKey.get(relativePath);

            if (!remote) {
              return {
                filePath,
                key,
                needsUpload: true,
                reason: "new" as const,
              };
            }

            const localStats = yield* fs.stat(filePath);
            const localLastModified = localStats.mtime.pipe(
              Option.getOrElse(() => new Date()),
            );
            const needsUpload =
              Number(localStats.size) !== remote.size ||
              localLastModified > remote.lastModified;

            return {
              filePath,
              key,
              needsUpload,
              reason: needsUpload
                ? ("modified" as const)
                : ("unchanged" as const),
            };
          }),
        ),
        { concurrency: CHECK_CONCURRENCY },
      );
    });
  }

  getContentBaseUrl(): string {
    return new URL(
      `${this.config.prefix ?? ""}/`,
      this.config.domain,
    ).toString();
  }

  getMediaBaseUrl(): string {
    return new URL(
      `${this.config.prefix ?? ""}/`,
      this.config.domain,
    ).toString();
  }

  publishContent(localDir: AbsoluteDir, force = false) {
    return Effect.gen({ self: this }, function* () {
      const entries = yield* readDirWithFileTypes(localDir, {
        recursive: true,
      });
      const files = entries
        .filter(([, type]) => type === "File")
        .map(
          ([relativePath]) =>
            path.join(localDir, relativePath as RelativeFile) as AbsoluteFile,
        );

      yield* this.publishFiles(files, localDir, force, "content");
    });
  }

  publishMedia(
    files: readonly AbsoluteFile[],
    rootDir: AbsoluteDir,
    force = false,
  ) {
    return this.publishFiles(files, rootDir, force, "media");
  }

  private publishFiles(
    files: readonly AbsoluteFile[],
    rootDir: AbsoluteDir,
    force: boolean,
    kind: "content" | "media",
  ) {
    return Effect.gen({ self: this }, function* () {
      if (files.length === 0) {
        yield* Effect.log(`No ${kind} files to upload.`);
        return;
      }

      yield* Effect.log(
        `Checking ${files.length} files against s3://${this.bucket}...`,
      );

      const statuses = yield* this.checkFiles(files, rootDir);
      const toUpload = force ? statuses : statuses.filter((s) => s.needsUpload);

      if (toUpload.length === 0) {
        yield* Effect.log("All files are up to date. Nothing to upload.");
        return;
      }

      yield* Effect.log(
        `Uploading ${toUpload.length} files (${statuses.length - toUpload.length} unchanged)...`,
      );

      yield* Effect.all(
        toUpload.map(({ filePath, key }) => this.uploadFile(filePath, key)),
        { concurrency: UPLOAD_CONCURRENCY },
      );

      yield* Effect.log(`Upload complete.`);
    });
  }

  listRemoteFiles() {
    const results: RemoteFileInfo[] = [];
    let continuationToken: string | undefined;

    return Effect.gen({ self: this }, function* () {
      do {
        const response = yield* Effect.promise(() =>
          this.client.send(
            new ListObjectsV2Command({
              Bucket: this.bucket,
              ContinuationToken: continuationToken,
              Prefix: this.prefix ? `${this.prefix}/` : undefined,
            }),
          ),
        );

        if (response.Contents) {
          for (const obj of response.Contents) {
            if (obj.Key && obj.Size !== undefined && obj.LastModified) {
              // Remove prefix from key to get relative path
              let relativeKey = RelativeFile(obj.Key);
              if (this.prefix && relativeKey.startsWith(`${this.prefix}/`)) {
                relativeKey = relativeKey.slice(
                  this.prefix.length + 1,
                ) as RelativeFile;
              }

              results.push({
                key: relativeKey,
                lastModified: obj.LastModified,
                size: obj.Size,
              });
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return results;
    });
  }

  checkRemoteFiles(
    remoteFiles: readonly RemoteFileInfo[],
    rootDir: AbsoluteDir,
  ) {
    return Effect.all(
      remoteFiles.map((remoteFile) => {
        const localPath = path.join(rootDir, remoteFile.key);
        return this.getDownloadStatus(remoteFile, localPath);
      }),
      { concurrency: CHECK_CONCURRENCY },
    );
  }

  downloadMedia = Effect.fn("downloadMedia")(
    { self: this },
    function* (this: S3Provider, files: FileDownloadStatus[]) {
      const toDownload = files.filter((f) => f.needsDownload);

      if (toDownload.length === 0) {
        yield* Effect.log("All files are up to date. Nothing to download.");
        return 0;
      }

      yield* Effect.log(
        `Downloading ${toDownload.length} files (${files.length - toDownload.length} unchanged)...`,
      );

      yield* Effect.all(
        toDownload.map(({ key, localPath }) =>
          Effect.promise(() => this.downloadFile(key, localPath)),
        ),
        { concurrency: DOWNLOAD_CONCURRENCY },
      );

      yield* Effect.log(`Download complete.`);
      return toDownload.length;
    },
  );

  /**
   * Get the download status for a single file.
   * Never marks a file for download if the local version is newer.
   */
  private readonly getDownloadStatus = Effect.fnUntraced(
    function* (remoteFile: RemoteFileInfo, localPath: AbsoluteFile) {
      const fs = yield* FileSystem.FileSystem;

      // Get local file modification time
      const localStats = yield* fs.stat(localPath);
      const localLastModified = localStats.mtime.pipe(
        Option.getOrElse(() => new Date()),
      );

      // Download only if remote file is newer than local
      if (remoteFile.lastModified > localLastModified) {
        return {
          key: remoteFile.key,
          localPath,
          needsDownload: true,
          reason: "modified" as const,
        };
      }

      return {
        key: remoteFile.key,
        localPath,
        needsDownload: false,
        reason: "unchanged" as const,
      };
    },
    (effect, remoteFile, localPath) =>
      effect.pipe(
        Effect.catchReason("PlatformError", "NotFound", () =>
          Effect.succeed({
            key: remoteFile.key,
            localPath,
            needsDownload: true,
            reason: "new" as const,
          }),
        ),
      ),
  );

  /**
   * Download a single file from S3
   */
  private async downloadFile(key: RelativeFile, localPath: AbsoluteFile) {
    const fullKey = this.buildKey(key);

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      }),
    );

    if (!response.Body) {
      throw new Error(`Empty response body for ${fullKey}`);
    }

    // Ensure the directory exists
    const dir = path.dirname(localPath);
    await fsp.mkdir(dir, { recursive: true });

    // Convert the readable stream to a buffer and write to file
    const chunks: Uint8Array[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    await fsp.writeFile(localPath, buffer);
    console.log(`  Downloaded: ${key}`);
  }

  /**
   * Build the S3 key for a file
   */
  private buildKey(relativePath: RelativeFile): RelativeFile {
    const parts: string[] = [];

    if (this.prefix) {
      parts.push(this.prefix);
    }

    parts.push(relativePath);

    // Normalize path separators to forward slashes for S3
    return RelativeFile(parts.join("/").replace(/\\/g, "/"));
  }

  /**
   * Upload a single file to S3 using multipart upload for large files
   */
  private readonly uploadFile = Effect.fn("uploadFile")(
    { self: this },
    function* (this: S3Provider, filePath: AbsoluteFile, key: string) {
      const fs = yield* FileSystem.FileSystem;

      const fileContent = yield* fs.readFile(filePath);
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

      yield* Effect.promise(() => upload.done());
      yield* Effect.log(`  Uploaded: ${key}`);
    },
  );
}
