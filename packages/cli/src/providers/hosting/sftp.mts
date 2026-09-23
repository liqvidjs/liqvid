import * as path from "node:path";

import type { ProviderConfigSFTP } from "@liqvid/schemas";
import { Effect, FileSystem, Option, type PlatformError } from "effect";
import {
  type AbsoluteDir,
  type AbsoluteFile,
  RelativeFile,
} from "effect-paths";
import { execa } from "execa";

import { rsyncRemoteDirectory } from "#_/utils/rsync.mjs";

import type {
  FileDownloadStatus,
  HostingProvider,
  MediaHostingProvider,
  RemoteFileInfo,
} from "../types.mts";

const TRANSFER_CONCURRENCY = 5;

export class SFTPProvider implements HostingProvider, MediaHostingProvider {
  readonly #host: string;
  readonly #path: string;
  readonly #domain: string | undefined;
  readonly #basePath: string | undefined;

  constructor(options: ProviderConfigSFTP) {
    this.#host = options.host;
    this.#path = options.path;
    this.#domain = options.domain?.toString();
    this.#basePath = options.basePath;
  }

  checkFiles(files: readonly AbsoluteFile[], rootDir: AbsoluteDir) {
    return Effect.gen({ self: this }, function* (this: SFTPProvider) {
      const remoteFiles = yield* this.listRemoteFiles();
      const remoteByKey = new Map(remoteFiles.map((file) => [file.key, file]));
      const fs = yield* FileSystem.FileSystem;

      return yield* Effect.all(
        files.map((filePath) =>
          Effect.gen(function* () {
            const key = RelativeFile(path.relative(rootDir, filePath));
            const remote = remoteByKey.get(key);
            if (!remote) {
              return {
                filePath,
                key,
                needsUpload: true,
                reason: "new" as const,
              };
            }

            const stats = yield* fs.stat(filePath);
            const localMtime = stats.mtime.pipe(
              Option.getOrElse(() => new Date()),
            );
            const needsUpload =
              Number(stats.size) !== remote.size ||
              localMtime > remote.lastModified;

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
      );
    });
  }

  checkRemoteFiles(
    remoteFiles: readonly RemoteFileInfo[],
    rootDir: AbsoluteDir,
  ) {
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      return yield* Effect.all(
        remoteFiles.map((remoteFile) =>
          Effect.gen(function* () {
            const localPath = path.join(rootDir, remoteFile.key);
            const stats = yield* fs.stat(localPath);
            const localMtime = stats.mtime.pipe(
              Option.getOrElse(() => new Date()),
            );
            const needsDownload =
              Number(stats.size) !== remoteFile.size ||
              remoteFile.lastModified > localMtime;

            return {
              key: remoteFile.key,
              localPath,
              needsDownload,
              reason: needsDownload
                ? ("modified" as const)
                : ("unchanged" as const),
            };
          }).pipe(
            Effect.catchReason("PlatformError", "NotFound", () =>
              Effect.succeed({
                key: remoteFile.key,
                localPath: path.join(rootDir, remoteFile.key),
                needsDownload: true,
                reason: "new" as const,
              }),
            ),
          ),
        ),
      );
    });
  }

  downloadMedia = Effect.fn("downloadMedia")(
    { self: this },
    function* (this: SFTPProvider, files: readonly FileDownloadStatus[]) {
      const toDownload = files.filter((file) => file.needsDownload);
      if (toDownload.length === 0) {
        yield* Effect.log("All files are up to date. Nothing to download.");
        return 0;
      }

      const fs = yield* FileSystem.FileSystem;
      yield* Effect.all(
        toDownload.map(({ key, localPath }) =>
          Effect.gen({ self: this }, function* () {
            yield* fs.makeDirectory(path.dirname(localPath), {
              recursive: true,
            });
            yield* Effect.tryPromise(() =>
              execa("rsync", [
                "--archive",
                "--compress",
                `${this.#host}:${this.#remotePath(key)}`,
                localPath,
              ]),
            ).pipe(Effect.orDie);
            yield* Effect.log(`  Downloaded: ${key}`);
          }),
        ),
        { concurrency: TRANSFER_CONCURRENCY },
      );

      return toDownload.length;
    },
  );

  getContentBaseUrl(): string {
    const baseUrl = this.#domain ?? `https://${this.#host}`;
    const basePath = this.#basePath?.replace(/^\/+|\/+$/g, "");
    return basePath ? `${baseUrl}/${basePath}` : baseUrl;
  }

  getMediaBaseUrl(): string {
    return this.getContentBaseUrl();
  }

  listRemoteFiles(): Effect.Effect<
    RemoteFileInfo[],
    PlatformError.PlatformError,
    FileSystem.FileSystem
  > {
    return Effect.tryPromise(() =>
      execa("ssh", [
        this.#host,
        `find -- ${this.#shellQuote(this.#path)} -type f -printf '%P\\t%s\\t%T@\\n'`,
      ]),
    ).pipe(
      Effect.map(({ stdout }) =>
        stdout
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [key, size, modified] = line.split("\t");
            if (!key || !size || !modified) {
              throw new Error(`Invalid remote file metadata: ${line}`);
            }
            return {
              key: RelativeFile(key),
              lastModified: new Date(Number(modified) * 1000),
              size: Number(size),
            };
          }),
      ),
      Effect.orDie,
    );
  }

  publishContent(localDir: AbsoluteDir, force = false) {
    return Effect.promise(() =>
      rsyncRemoteDirectory({
        force,
        host: this.#host,
        localDir,
        remoteDir: this.#path,
      }),
    );
  }

  publishMedia = Effect.fn("publishMedia")(
    { self: this },
    function* (
      this: SFTPProvider,
      files: readonly AbsoluteFile[],
      rootDir: AbsoluteDir,
      force = false,
    ) {
      if (files.length === 0) {
        yield* Effect.log("No media files to upload.");
        return;
      }

      const statuses = yield* this.checkFiles(files, rootDir);
      const toUpload = force
        ? statuses
        : statuses.filter((file) => file.needsUpload);
      if (toUpload.length === 0) {
        yield* Effect.log("All files are up to date. Nothing to upload.");
        return;
      }

      yield* Effect.all(
        toUpload.map(({ filePath, key }) =>
          Effect.gen({ self: this }, function* () {
            const remotePath = this.#remotePath(key);
            yield* Effect.tryPromise(() =>
              execa("ssh", [
                this.#host,
                `mkdir -p -- ${this.#shellQuote(path.posix.dirname(remotePath))}`,
              ]),
            ).pipe(Effect.orDie);
            yield* Effect.tryPromise(() =>
              execa("rsync", [
                "--archive",
                ...(force ? ["--ignore-times"] : []),
                "--compress",
                filePath,
                `${this.#host}:${remotePath}`,
              ]),
            ).pipe(Effect.orDie);
            yield* Effect.log(`  Uploaded: ${key}`);
          }),
        ),
        { concurrency: TRANSFER_CONCURRENCY },
      );
    },
  );

  #remotePath(key: string): string {
    const normalized = path.posix.normalize(key);
    if (
      normalized === ".." ||
      normalized.startsWith("../") ||
      path.posix.isAbsolute(normalized)
    ) {
      throw new Error(`Invalid remote file key: ${key}`);
    }
    return path.posix.join(this.#path, normalized);
  }

  #shellQuote(value: string): string {
    return `'${value.replaceAll("'", "'\\''")}'`;
  }
}
