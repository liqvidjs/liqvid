import * as path from "node:path";

import type { ProviderConfigCopy } from "@liqvid/schemas";
import { Effect, FileSystem, Option, type PlatformError } from "effect";
import {
  type AbsoluteDir,
  type AbsoluteFile,
  RelativeDir,
  type RelativeFile,
} from "effect-paths";

import { readDirWithFileTypes } from "#_/utils/effect.mjs";
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
  readonly #config: ProviderConfigCopy;

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
  readonly #cleanDirectory = Effect.fnUntraced(function* (dir: AbsoluteDir) {
    const fs = yield* FileSystem.FileSystem;

    yield* fs.remove(dir, { force: true, recursive: true });
  });

  /**
   * Copy a directory recursively.
   */
  #copyDirectory(
    src: AbsoluteDir,
    dest: AbsoluteDir,
  ): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> {
    return Effect.gen({ self: this }, function* (this: CopyProvider) {
      const fs = yield* FileSystem.FileSystem;

      // Ensure destination exists
      yield* fs.makeDirectory(dest, { recursive: true });

      const entries = yield* readDirWithFileTypes(src);

      for (const [name, kind] of entries) {
        if (kind === "Directory") {
          const srcPath = path.join(src, name);
          const destPath = path.join(dest, name);
          yield* this.#copyDirectory(srcPath, destPath);
        } else if (kind === "File") {
          const srcPath = path.join(src, name);
          const destPath = path.join(dest, name);
          yield* fs.copyFile(srcPath, destPath);
        }
      }
    });
  }

  /**
   * Copy a single file, creating parent directories as needed.
   */
  readonly #copyFile = Effect.fnUntraced(function* (
    srcPath: AbsoluteFile,
    destPath: AbsoluteFile,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const destDir = path.dirname(destPath);
    yield* fs.makeDirectory(destDir, { recursive: true });
    yield* fs.copyFile(srcPath, destPath);
  });

  // HostingProvider implementation

  publishContent(localDir: AbsoluteDir, _force = false) {
    return Effect.gen({ self: this }, function* (this: CopyProvider) {
      const destination = this.#getDestination("hosting");

      if (this.#config.clean) {
        console.log(`Cleaning destination directory: ${destination}`);
        yield* this.#cleanDirectory(destination);
      }

      console.log(`Copying content from ${localDir} to ${destination}`);
      yield* this.#copyDirectory(localDir, destination);
      console.log("Copy complete.");
    });
  }

  // MediaHostingProvider implementation

  checkFiles(files: readonly AbsoluteFile[], rootDir: AbsoluteDir) {
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

  checkRemoteFiles(
    remoteFiles: readonly RemoteFileInfo[],
    rootDir: AbsoluteDir,
  ) {
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

  readonly #getDownloadStatus = Effect.fnUntraced(
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

  downloadMedia = Effect.fn("downloadMedia")(
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
        yield* this.#copyFile(srcPath, localPath);
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
    return `file: //${path.resolve(destination)}`;
  }

  listRemoteFiles(): Effect.Effect<
    RemoteFileInfo[],
    PlatformError.PlatformError,
    FileSystem.FileSystem
  > {
    return this.#listFilesRecursive(
      this.#getDestination("media"),
      RelativeDir(""),
    );
  }

  #listFilesRecursive(
    baseDir: AbsoluteDir,
    relativePath: RelativeDir,
    results: RemoteFileInfo[] = [],
  ): Effect.Effect<
    RemoteFileInfo[],
    PlatformError.PlatformError,
    FileSystem.FileSystem
  > {
    return Effect.gen({ self: this }, function* (this: CopyProvider) {
      const fs = yield* FileSystem.FileSystem;
      const currentDir = path.join(baseDir, relativePath);
      const entries = yield* readDirWithFileTypes(currentDir).pipe(
        Effect.catchReason("PlatformError", "NotFound", () =>
          Effect.succeed([] as readonly [RelativeFile, "File"][]),
        ),
      );

      for (const [name, kind] of entries) {
        if (kind === "Directory") {
          const entryRelativePath = path.join(relativePath, name);
          yield* this.#listFilesRecursive(baseDir, entryRelativePath, results);
        } else if (kind === "File") {
          const entryPath = path.join(currentDir, name);
          const entryRelativePath = path.join(relativePath, name);
          const stats = yield* fs.stat(entryPath);
          results.push({
            key: entryRelativePath,
            lastModified: stats.mtime.pipe(Option.getOrElse(() => new Date())),
            size: Number(stats.size),
          });
        }
      }
      return results;
    });
  }

  publishMedia = Effect.fn("publishMedia")(
    { self: this },
    function* (
      this: CopyProvider,
      files: readonly AbsoluteFile[],
      rootDir: AbsoluteDir,
      force = false,
    ) {
      const destination = this.#getDestination("media");
      if (files.length === 0) {
        yield* Effect.log("No media files to copy.");
        return;
      }

      if (this.#config.clean) {
        yield* Effect.log(`Cleaning destination directory: ${destination}`);
        yield* this.#cleanDirectory(destination);
      }

      yield* Effect.log(`Checking ${files.length} files...`);

      const statuses = yield* this.checkFiles(files, rootDir);
      const toCopy = force ? statuses : statuses.filter((s) => s.needsUpload);

      if (toCopy.length === 0) {
        yield* Effect.log("All files are up to date. Nothing to copy.");
        return;
      }

      yield* Effect.log(
        `Copying ${toCopy.length} files (${statuses.length - toCopy.length} unchanged)...`,
      );

      for (const { filePath, key } of toCopy) {
        const destPath = path.join(destination, key);
        yield* this.#copyFile(filePath, destPath);
        yield* Effect.log(`  Copied: ${key}`);
      }

      yield* Effect.log("Copy complete.");
    },
  );
}
