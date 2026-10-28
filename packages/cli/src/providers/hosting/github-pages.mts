import * as path from "node:path";

import type { ProviderConfigGitHubPages } from "@liqvid/schemas";
import { Effect, type FileSystem, type PlatformError } from "effect";
import type { AbsoluteDir, AbsoluteFile, RelativeFile } from "effect-paths";

import {
  type GitHubPagesLocalFile,
  publishGitHubPages,
} from "#_/providers/hosting/github-pages-git";
import { readDirWithFileTypes } from "#_/utils/effect";

import type { HostingProvider } from "../types.mts";

/** Publishes a static site to the gh-pages branch of a GitHub repository. */
export class GitHubPagesProvider implements HostingProvider {
  readonly #config: ProviderConfigGitHubPages;
  readonly #token: string;

  constructor(config: ProviderConfigGitHubPages) {
    const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    if (!token) {
      throw new Error(
        "GitHub Pages publishing requires GITHUB_TOKEN or GH_TOKEN to be set",
      );
    }

    this.#config = config;
    this.#token = token;
  }

  getContentBaseUrl() {
    const { branch, repository, username } = this.#config;

    const isRoot = repository === `${username}.github.io` && branch === "main";

    return isRoot ? "/" : `/${repository}`;
  }

  publishContent(localDir: AbsoluteDir) {
    return Effect.gen({ self: this }, function* () {
      const files = yield* this.#listFiles(localDir);
      yield* publishGitHubPages(this.#config, this.#token, files);
    }).pipe(Effect.orDie);
  }

  #listFiles(
    directory: AbsoluteDir,
  ): Effect.Effect<
    GitHubPagesLocalFile[],
    PlatformError.PlatformError,
    FileSystem.FileSystem
  > {
    return this.#visitDirectory(directory, "");
  }

  #visitDirectory(
    directory: AbsoluteDir,
    relativeDirectory: string,
    files: GitHubPagesLocalFile[] = [],
  ): Effect.Effect<
    GitHubPagesLocalFile[],
    PlatformError.PlatformError,
    FileSystem.FileSystem
  > {
    return Effect.gen({ self: this }, function* (this: GitHubPagesProvider) {
      for (const [name, kind] of yield* readDirWithFileTypes(directory)) {
        const filePath = path.join(directory, name) as AbsoluteFile;
        const relativePath = path.posix.join(relativeDirectory, String(name));
        if (kind === "Directory") {
          yield* this.#visitDirectory(
            filePath as unknown as AbsoluteDir,
            relativePath,
            files,
          );
        } else if (kind === "File") {
          files.push({
            key: relativePath as unknown as RelativeFile,
            path: filePath,
          });
        }
      }

      return files;
    });
  }
}
