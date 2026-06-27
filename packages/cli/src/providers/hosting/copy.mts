import * as fsp from "node:fs/promises";
import * as path from "node:path";

import type { ProviderConfigCopy } from "@liqvid/schemas/providers";

import { expandTilde } from "../../utils/paths.mts";
import type {
  FileDownloadStatus,
  FileUploadStatus,
  HostingProvider,
  MediaHostingProvider,
  RemoteFileInfo,
} from "../types.mts";

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
  #getDestination(mode: "hosting" | "media"): string {
    const { destination } = this.#config;
    const dest =
      typeof destination === "string" ? destination : destination[mode];
    return expandTilde(dest);
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

  async checkFiles(
    files: string[],
    rootDir: string,
  ): Promise<FileUploadStatus[]> {
    const destination = this.#getDestination("media");
    const results: FileUploadStatus[] = [];

    for (const filePath of files) {
      const relativePath = path.relative(rootDir, filePath);
      const destPath = path.join(destination, relativePath);
      const status = await this.#getUploadStatus(
        filePath,
        destPath,
        relativePath,
      );
      results.push(status);
    }

    return results;
  }

  async #getUploadStatus(
    srcPath: string,
    destPath: string,
    key: string,
  ): Promise<FileUploadStatus> {
    try {
      const [srcStats, destStats] = await Promise.all([
        fsp.stat(srcPath),
        fsp.stat(destPath),
      ]);

      // Copy if source is newer than destination
      if (srcStats.mtime > destStats.mtime) {
        return {
          filePath: srcPath,
          key,
          needsUpload: true,
          reason: "modified",
        };
      }

      return {
        filePath: srcPath,
        key,
        needsUpload: false,
        reason: "unchanged",
      };
    } catch (err) {
      // If destination doesn't exist, we need to copy
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return { filePath: srcPath, key, needsUpload: true, reason: "new" };
      }
      throw err;
    }
  }

  async checkRemoteFiles(
    remoteFiles: RemoteFileInfo[],
    rootDir: string,
  ): Promise<FileDownloadStatus[]> {
    const destination = this.#getDestination("media");
    const results: FileDownloadStatus[] = [];

    for (const remoteFile of remoteFiles) {
      const localPath = path.join(rootDir, remoteFile.key);
      const remotePath = path.join(destination, remoteFile.key);
      const status = await this.#getDownloadStatus(
        remoteFile,
        localPath,
        remotePath,
      );
      results.push(status);
    }

    return results;
  }

  async #getDownloadStatus(
    remoteFile: RemoteFileInfo,
    localPath: string,
    remotePath: string,
  ): Promise<FileDownloadStatus> {
    try {
      const localStats = await fsp.stat(localPath);

      // Check if remote file is newer
      const remoteStats = await fsp.stat(remotePath);
      if (remoteStats.mtime > localStats.mtime) {
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
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          key: remoteFile.key,
          localPath,
          needsDownload: true,
          reason: "new",
        };
      }
      throw err;
    }
  }

  async downloadMedia(files: FileDownloadStatus[]): Promise<number> {
    const destination = this.#getDestination("media");
    const toDownload = files.filter((f) => f.needsDownload);

    if (toDownload.length === 0) {
      console.log("All files are up to date. Nothing to download.");
      return 0;
    }

    console.log(
      `Copying ${toDownload.length} files (${files.length - toDownload.length} unchanged)...`,
    );

    for (const { key, localPath } of toDownload) {
      const srcPath = path.join(destination, key);
      await this.#copyFile(srcPath, localPath);
      console.log(`  Copied: ${key}`);
    }

    console.log("Copy complete.");
    return toDownload.length;
  }

  getBaseUrl(): string {
    // For local copy, return a file:// URL or empty string
    // since this is primarily for local development/testing
    const destination = this.#getDestination("media");
    return `file://${path.resolve(destination)}`;
  }

  async listRemoteFiles(): Promise<RemoteFileInfo[]> {
    const destination = this.#getDestination("media");
    const results: RemoteFileInfo[] = [];

    await this.#listFilesRecursive(destination, "", results);

    return results;
  }

  async #listFilesRecursive(
    baseDir: string,
    relativePath: string,
    results: RemoteFileInfo[],
  ): Promise<void> {
    const currentDir = path.join(baseDir, relativePath);

    try {
      const entries = await fsp.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const entryRelativePath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          await this.#listFilesRecursive(baseDir, entryRelativePath, results);
        } else {
          const fullPath = path.join(currentDir, entry.name);
          const stats = await fsp.stat(fullPath);

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

  async publishMedia(files: string[], rootDir: string): Promise<void> {
    const destination = this.#getDestination("media");

    if (files.length === 0) {
      console.log("No media files to copy.");
      return;
    }

    if (this.#config.clean) {
      console.log(`Cleaning destination directory: ${destination}`);
      await this.#cleanDirectory(destination);
    }

    console.log(`Checking ${files.length} files...`);

    const statuses = await this.checkFiles(files, rootDir);
    const toCopy = statuses.filter((s) => s.needsUpload);

    if (toCopy.length === 0) {
      console.log("All files are up to date. Nothing to copy.");
      return;
    }

    console.log(
      `Copying ${toCopy.length} files (${statuses.length - toCopy.length} unchanged)...`,
    );

    for (const { filePath, key } of toCopy) {
      const destPath = path.join(destination, key);
      await this.#copyFile(filePath, destPath);
      console.log(`  Copied: ${key}`);
    }

    console.log("Copy complete.");
  }
}
