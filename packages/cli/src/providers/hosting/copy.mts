import * as fsp from "node:fs/promises";
import * as path from "node:path";

import type { ProviderConfigCopy } from "@liqvid/schemas";
import { Effect, FileSystem, Option } from "effect";
import {
  type AbsoluteDir,
  type AbsoluteFile,
  RelativeDir,
  type RelativeFile,
} from "effect-paths";

import { expandTilde } from "#_/utils/paths.mjs";

import type {
  FileDownloadStatus,
  HostingProvider,
  MediaHostingProvider,
  RemoteFileInfo,
} from "../types.mts";

const CHECK_CONCURRENCY = 50;
/**
 * Copy provider that copies output to another location on disk.
 * Implements both HostingProvider and MediaHostingProvider.
 */
export class CopyProvider implements HostingProvider, MediaHostingProvider {
  #config: ProviderConfigCopy;

  constructor(config: ProviderConfigCopy) {
    this.#config = config;
  }

  /**
   * Get the destination directory for a given mode.
   */
  #getDestination(mode: "hosting" | "media") {
    const { destination } = this.#config;
    let dest =
      typeof destination === "string" ? destination : destination[mode];

    dest = expandTilde(dest);

    if (!path.isAbsolute(dest)) {
      dest = path.resolve(process.cwd(), dest);
    }
    return dest;
  }

  /**
   * Clean a directory by removing all its contents.
   */
  async #cleanDirectory(dir: string): Promise<void> {
    try {
      await fsp.rm(dir, { force: true, recursive: true });
    } catch (err) {
      // Ignore if directory doesn't exist
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  }

  /**
   * Copy a directory recursively.
   */
  async #copyDirectory(src: string, dest: string): Promise<void> {
    // Ensure destination exists
    await fsp.mkdir(dest, { recursive: true });

    const entries = await fsp.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.#copyDirectory(srcPath, destPath);
      } else {
        await fsp.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Copy a single file, creating parent directories as needed.
   */
  async #copyFile(srcPath: string, destPath: string): Promise<void> {
    const destDir = path.dirname(destPath);
    await fsp.mkdir(destDir, { recursive: true });
    await fsp.copyFile(srcPath, destPath);
  }

  // HostingProvider implementation

  async publishContent(localDir: string): Promise<void> {
    const destination = this.#getDestination("hosting");

    if (this.#config.clean) {
      console.log(`Cleaning destination directory: ${destination}`);
      await this.#cleanDirectory(destination);
    }

    console.log(`Copying content from ${localDir} to ${destination}`);
    await this.#copyDirectory(localDir, destination);
    console.log("Copy complete.");
  }

  // MediaHostingProvider implementation

  checkFiles(files: AbsoluteFile[], rootDir: AbsoluteDir) {
    const destination = this.#getDestination("media");

    return Effect.all(
      files.map((filePath) => {
        const relativePath = path.relative(rootDir, filePath);
        const destPath = path.join(destination, relativePath);
        return this.#getUploadStatus(filePath, destPath, relativePath);
      }),
      { concurrency: CHECK_CONCURRENCY },
    );
  }

  #getUploadStatus(
    srcPath: AbsoluteFile,
    destPath: AbsoluteFile,
    key: RelativeFile,
  ) {
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      const srcStats = yield* fs.stat(srcPath);
      const destStats = yield* fs.stat(destPath);

      const srcMtime = srcStats.mtime.pipe(Option.getOrElse(() => new Date()));
      const destMtime = destStats.mtime.pipe(
        Option.getOrElse(() => new Date()),
      );

      // Copy if source is newer than destination
      if (srcMtime > destMtime) {
        return {
          filePath: srcPath,
          key,
          needsUpload: true,
          reason: "modified" as const,
        };
      }

      return {
        filePath: srcPath,
        key,
        needsUpload: false,
        reason: "unchanged" as const,
      };
    }).pipe(
      Effect.catchReason("PlatformError", "NotFound", () =>
        Effect.succeed({
          filePath: srcPath,
          key,
          needsUpload: true,
          reason: "new" as const,
        }),
      ),
    );
  }

  checkRemoteFiles(remoteFiles: RemoteFileInfo[], rootDir: AbsoluteDir) {
    const destination = this.#getDestination("media");

    return Effect.all(
      remoteFiles.map((remoteFile) => {
        const localPath = path.join(rootDir, remoteFile.key);
        const remotePath = path.join(destination, remoteFile.key);
        return this.#getDownloadStatus(remoteFile, localPath, remotePath);
      }),
      { concurrency: CHECK_CONCURRENCY },
    );
  }

  #getDownloadStatus = Effect.fnUntraced(
    function* (
      remoteFile: RemoteFileInfo,
      localPath: AbsoluteFile,
      remotePath: AbsoluteFile,
    ) {
      const fs = yield* FileSystem.FileSystem;

      const localStats = yield* fs.stat(localPath);
      const remoteStats = yield* fs.stat(remotePath);

      const localMtime = localStats.mtime.pipe(
        Option.getOrElse(() => new Date()),
      );
      const remoteMtime = remoteStats.mtime.pipe(
        Option.getOrElse(() => new Date()),
      );

      // Check if remote file is newer
      if (remoteMtime > localMtime) {
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

  downloadMedia = Effect.fnUntraced(
    { self: this },
    function* (this: CopyProvider, files: FileDownloadStatus[]) {
      const destination = this.#getDestination("media");

      const toDownload = files.filter((f) => f.needsDownload);

      if (toDownload.length === 0) {
        yield* Effect.log("All files are up to date. Nothing to download.");
        return 0;
      }

      yield* Effect.log(
        `Copying ${toDownload.length} files (${files.length - toDownload.length} unchanged)...`,
      );

      for (const { key, localPath } of toDownload) {
        const srcPath = path.join(destination, key);
        yield* Effect.promise(() => this.#copyFile(srcPath, localPath));
        yield* Effect.log(`  Copied: ${key}`);
      }

      yield* Effect.log("Copy complete.");
      return toDownload.length;
    },
  );

  getBaseUrl(): string {
    // For local copy, return a file:// URL or empty string
    // since this is primarily for local development/testing
    const destination = this.#getDestination("media");
    return `file://${path.resolve(destination)}`;
  }

  async listRemoteFiles(): Promise<RemoteFileInfo[]> {
    const destination = this.#getDestination("media");
    const results: RemoteFileInfo[] = [];

    await this.#listFilesRecursive(destination, RelativeDir(""), results);

    return results;
  }

  async #listFilesRecursive(
    baseDir: AbsoluteDir,
    relativePath: RelativeDir,
    results: RemoteFileInfo[],
  ): Promise<void> {
    const currentDir = path.join(baseDir, relativePath);

    try {
      const entries = await fsp.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const entryRelativePath = path.join(relativePath, entry.name);
          await this.#listFilesRecursive(baseDir, entryRelativePath, results);
        } else if (entry.isFile()) {
          const fullPath = path.join(currentDir, entry.name);
          const stats = await fsp.stat(fullPath);
          const entryRelativePath = path.join(relativePath, entry.name);

          results.push({
            key: entryRelativePath,
            lastModified: stats.mtime,
            size: stats.size,
          });
        }
      }
    } catch (err) {
      // If directory doesn't exist, return empty results
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  }

  publishMedia = Effect.fnUntraced(
    { self: this },
    function* (
      this: CopyProvider,
      files: AbsoluteFile[],
      rootDir: AbsoluteDir,
    ) {
      const destination = this.#getDestination("media");
      if (files.length === 0) {
        yield* Effect.log("No media files to copy.");
        return;
      }

      if (this.#config.clean) {
        yield* Effect.log(`Cleaning destination directory: ${destination}`);
        yield* Effect.promise(() => this.#cleanDirectory(destination));
      }

      yield* Effect.log(`Checking ${files.length} files...`);

      const statuses = yield* this.checkFiles(files, rootDir);
      const toCopy = statuses.filter((s) => s.needsUpload);

      if (toCopy.length === 0) {
        yield* Effect.log("All files are up to date. Nothing to copy.");
        return;
      }

      yield* Effect.log(
        `Copying ${toCopy.length} files (${statuses.length - toCopy.length} unchanged)...`,
      );

      for (const { filePath, key } of toCopy) {
        const destPath = path.join(destination, key);
        yield* Effect.promise(() => this.#copyFile(filePath, destPath));
        yield* Effect.log(`  Copied: ${key}`);
      }

      yield* Effect.log("Copy complete.");
    },
  );
}
