import type { ProviderConfigSFTP } from "@liqvid/schemas";

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

  async checkFiles(
    _files: string[],
    _rootDir: string,
  ): Promise<FileUploadStatus[]> {
    throw new Error("SFTPProvider.checkFiles not implemented");
  }

  async checkRemoteFiles(
    _remoteFiles: RemoteFileInfo[],
    _rootDir: string,
  ): Promise<FileDownloadStatus[]> {
    throw new Error("SFTPProvider.checkRemoteFiles not implemented");
  }

  async downloadMedia(_files: FileDownloadStatus[]): Promise<number> {
    throw new Error("SFTPProvider.downloadMedia not implemented");
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

  async publishMedia(_localDirs: string[], _rootDir: string): Promise<void> {}
}
