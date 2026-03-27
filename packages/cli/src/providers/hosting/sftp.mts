import { z } from "zod";

import { rsyncRemoteDirectory } from "../../utils/rsync.mts";
import type { MediaHostingProvider } from "../types.mts";

export const ProviderConfigSFTP = z.object({
  host: z.string(),
  path: z.string(),
});

export type ProviderConfigSFTP = z.infer<typeof ProviderConfigSFTP>;

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
