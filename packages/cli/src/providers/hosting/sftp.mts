import type { ProviderConfigSFTP } from "@liqvid/schemas/providers";

import { rsyncRemoteDirectory } from "../../utils/rsync.mts";
import type { MediaHostingProvider } from "../types.mts";

export class SFTPProvider implements MediaHostingProvider {
  #host: string;
  #path: string;

  constructor(options: ProviderConfigSFTP) {
    this.#host = options.host;
    this.#path = options.path;
  }

  async publishContent(localDir: string): Promise<void> {
    await rsyncRemoteDirectory({
      host: this.#host,
      localDir,
      remoteDir: this.#path,
    });
  }

  async publishMedia(_localDirs: string[]): Promise<void> {}
}
