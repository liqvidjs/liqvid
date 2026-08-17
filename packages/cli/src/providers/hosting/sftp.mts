import type { ProviderConfigSFTP } from "@liqvid/schemas";
import { Effect } from "effect";
import type { AbsoluteDir, AbsoluteFile } from "effect-paths";

import { rsyncRemoteDirectory } from "../../utils/rsync.mts";
import type {
  FileDownloadStatus,
  FileUploadStatus,
  MediaHostingProvider,
  RemoteFileInfo,
} from "../types.mts";

export class SFTPProvider implements MediaHostingProvider {
  #host: string;
  #path: string;

  constructor(options: ProviderConfigSFTP) {
    this.#host = options.host;
    this.#path = options.path;
  }

  checkFiles(
    _files: AbsoluteFile[],
    _rootDir: AbsoluteDir,
  ): Effect.Effect<FileUploadStatus[]> {
    return Effect.die(new Error("SFTPProvider.checkFiles not implemented"));
  }

  checkRemoteFiles(
    _remoteFiles: RemoteFileInfo[],
    _rootDir: AbsoluteDir,
  ): Effect.Effect<FileDownloadStatus[]> {
    return Effect.die(
      new Error("SFTPProvider.checkRemoteFiles not implemented"),
    );
  }

  downloadMedia(_files: FileDownloadStatus[]): Effect.Effect<number> {
    return Effect.die(new Error("SFTPProvider.downloadMedia not implemented"));
  }

  getBaseUrl(): string {
    throw new Error("SFTPProvider.getBaseUrl not implemented");
  }

  async listRemoteFiles(): Promise<RemoteFileInfo[]> {
    throw new Error("SFTPProvider.listRemoteFiles not implemented");
  }

  async publishContent(localDir: string): Promise<void> {
    await rsyncRemoteDirectory({
      host: this.#host,
      localDir,
      remoteDir: this.#path,
    });
  }

  publishMedia(
    _localDirs: AbsoluteFile[],
    _rootDir: AbsoluteDir,
  ): Effect.Effect<void> {
    return Effect.die(new Error("SFTPProvider.publishMedia not implemented"));
  }
}
