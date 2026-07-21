import * as fsp from "node:fs/promises";
import * as path from "node:path";

import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
import { Upload } from "@aws-sdk/lib-storage";
import type { ProviderConfigS3 } from "@liqvid/schemas";
import { Redacted } from "effect";

import { parallelMap } from "../../utils/parallel.mts";
import type {
  FileDownloadStatus,
  FileUploadStatus,
  MediaHostingProvider,
  RemoteFileInfo,
} from "../types.mts";

const MAX_CONCURRENCY = 50;

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

  async checkFiles(
    files: string[],
    rootDir: string,
  ): Promise<FileUploadStatus[]> {
    return parallelMap(
      files,
      async (filePath) => {
        const relativeFromRoot = path.relative(rootDir, filePath);
        const key = this.buildKey(relativeFromRoot);
        return this.getUploadStatus(filePath, key);
      },
      MAX_CONCURRENCY,
    );
  }

  getBaseUrl(): string {
    return `${this.config.domain}/${this.config.prefix ?? ""}`;
  }

  async publishMedia(files: string[], rootDir: string): Promise<void> {
    if (files.length === 0) {
      console.log("No media files to upload.");
      return;
    }

    console.log(
      `Checking ${files.length} files against s3://${this.bucket}...`,
    );

    const statuses = await this.checkFiles(files, rootDir);
    const toUpload = statuses.filter((s) => s.needsUpload);

    if (toUpload.length === 0) {
      console.log("All files are up to date. Nothing to upload.");
      return;
    }

    console.log(
      `Uploading ${toUpload.length} files (${statuses.length - toUpload.length} unchanged)...`,
    );

    for (const { filePath, key } of toUpload) {
      await this.uploadFile(filePath, key);
    }

    console.log(`Upload complete.`);
  }

  async listRemoteFiles(): Promise<RemoteFileInfo[]> {
    const results: RemoteFileInfo[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          ContinuationToken: continuationToken,
          Prefix: this.prefix ? `${this.prefix}/` : undefined,
        }),
      );

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key && obj.Size !== undefined && obj.LastModified) {
            // Remove prefix from key to get relative path
            let relativeKey = obj.Key;
            if (this.prefix && relativeKey.startsWith(`${this.prefix}/`)) {
              relativeKey = relativeKey.slice(this.prefix.length + 1);
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
  }

  async checkRemoteFiles(
    remoteFiles: RemoteFileInfo[],
    rootDir: string,
  ): Promise<FileDownloadStatus[]> {
    return parallelMap(
      remoteFiles,
      async (remoteFile) => {
        const localPath = path.join(rootDir, remoteFile.key);
        return this.getDownloadStatus(remoteFile, localPath);
      },
      MAX_CONCURRENCY,
    );
  }

  async downloadMedia(files: FileDownloadStatus[]): Promise<number> {
    const toDownload = files.filter((f) => f.needsDownload);

    if (toDownload.length === 0) {
      console.log("All files are up to date. Nothing to download.");
      return 0;
    }

    console.log(
      `Downloading ${toDownload.length} files (${files.length - toDownload.length} unchanged)...`,
    );

    for (const { key, localPath } of toDownload) {
      await this.downloadFile(key, localPath);
    }

    console.log(`Download complete.`);
    return toDownload.length;
  }

  /**
   * Get the download status for a single file.
   * Never marks a file for download if the local version is newer.
   */
  private async getDownloadStatus(
    remoteFile: RemoteFileInfo,
    localPath: string,
  ): Promise<FileDownloadStatus> {
    try {
      // Get local file modification time
      const localStats = await fsp.stat(localPath);
      const localLastModified = localStats.mtime;

      // Download only if remote file is newer than local
      if (remoteFile.lastModified > localLastModified) {
        return {
          key: remoteFile.key,
          localPath,
          needsDownload: true,
          reason: "modified",
        };
      }

      return {
        key: remoteFile.key,
        localPath,
        needsDownload: false,
        reason: "unchanged",
      };
    } catch (err) {
      // If the local file doesn't exist, we need to download it
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          key: remoteFile.key,
          localPath,
          needsDownload: true,
          reason: "new",
        };
      }
      // For other errors, rethrow
      throw err;
    }
  }

  /**
   * Download a single file from S3
   */
  private async downloadFile(key: string, localPath: string): Promise<void> {
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
   * Get the upload status for a single file.
   */
  private async getUploadStatus(
    filePath: string,
    key: string,
  ): Promise<FileUploadStatus> {
    try {
      // Get remote file metadata
      const headResponse = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      const remoteLastModified = headResponse.LastModified;
      if (!remoteLastModified) {
        // Can't determine remote modification time, upload to be safe
        return { filePath, key, needsUpload: true, reason: "new" };
      }

      // Get local file modification time
      const localStats = await fsp.stat(filePath);
      const localLastModified = localStats.mtime;

      // Upload if local file is newer than remote
      if (localLastModified > remoteLastModified) {
        return { filePath, key, needsUpload: true, reason: "modified" };
      }

      return { filePath, key, needsUpload: false, reason: "unchanged" };
    } catch (err) {
      // If the file doesn't exist (404), we need to upload it
      if ((err as { name?: string }).name === "NotFound") {
        return { filePath, key, needsUpload: true, reason: "new" };
      }
      // For other errors, rethrow
      throw err;
    }
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
