import * as path from "node:path";

import type { ProviderConfigGitHubPages } from "@liqvid/schemas";
import { Octokit } from "@octokit/rest";
import { Effect, FileSystem, type PlatformError } from "effect";
import type { AbsoluteDir, AbsoluteFile, RelativeFile } from "effect-paths";

import { readDirWithFileTypes } from "#_/utils/effect";

import type { HostingProvider } from "../types.mts";

type LocalFile = Readonly<{
  key: RelativeFile;
  path: AbsoluteFile;
}>;

/** Publishes a static site to the gh-pages branch of a GitHub repository. */
export class GitHubPagesProvider implements HostingProvider {
  readonly #config: ProviderConfigGitHubPages;
  readonly #octokit: Octokit;

  constructor(config: ProviderConfigGitHubPages) {
    const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    if (!token) {
      throw new Error(
        "GitHub Pages publishing requires GITHUB_TOKEN or GH_TOKEN to be set",
      );
    }

    this.#config = config;
    this.#octokit = new Octokit({ auth: token });
  }

  publishContent(localDir: AbsoluteDir) {
    return Effect.gen({ self: this }, function* () {
      const fs = yield* FileSystem.FileSystem;

      const files = yield* this.#listFiles(localDir);
      const base = yield* this.#getBaseCommit();
      const filesToPublish = files.filter(({ key }) => key !== ".nojekyll");

      const blobs = yield* Effect.all(
        filesToPublish.map(({ key, path: filePath }) =>
          Effect.gen({ self: this }, function* (this: GitHubPagesProvider) {
            const contents = yield* fs.readFile(filePath);
            const response = yield* Effect.tryPromise(() =>
              this.#octokit.git.createBlob({
                content: Buffer.from(contents).toString("base64"),
                encoding: "base64",
                owner: this.#config.username,
                repo: this.#config.repository,
              }),
            );
            return {
              mode: "100644" as const,
              path: key,
              sha: (response as { data: { sha: string } }).data.sha,
              type: "blob" as const,
            };
          }),
        ),
        { concurrency: 20 },
      );
      const nojekyll = yield* Effect.tryPromise(() =>
        this.#octokit.git.createBlob({
          content: "",
          encoding: "utf-8",
          owner: this.#config.username,
          repo: this.#config.repository,
        }),
      );

      const tree = yield* Effect.tryPromise(() =>
        this.#octokit.git.createTree({
          owner: this.#config.username,
          repo: this.#config.repository,
          tree: [
            ...blobs,
            {
              mode: "100644",
              path: ".nojekyll",
              sha: (nojekyll as { data: { sha: string } }).data.sha,
              type: "blob",
            },
          ],
        }),
      );
      const commit = yield* Effect.tryPromise(() =>
        this.#octokit.git.createCommit({
          author: {
            email: `${this.#config.username}@users.noreply.github.com`,
            name: this.#config.username,
          },
          message: "Publish Liqvid site",
          owner: this.#config.username,
          parents: [base.commitSha],
          repo: this.#config.repository,
          tree: tree.data.sha,
        }),
      );

      if (base.branchExists) {
        yield* Effect.tryPromise(() =>
          this.#octokit.git.updateRef({
            owner: this.#config.username,
            ref: `heads/${base.branchName}`,
            repo: this.#config.repository,
            sha: commit.data.sha,
          }),
        );
      } else {
        yield* Effect.tryPromise(() =>
          this.#octokit.git.createRef({
            owner: this.#config.username,
            ref: `refs/heads/${base.branchName}`,
            repo: this.#config.repository,
            sha: commit.data.sha,
          }),
        );
      }

      yield* Effect.log(
        `Published ${filesToPublish.length} files to ${this.#config.username}/${this.#config.repository}:${base.branchName}`,
      );
    }).pipe(Effect.orDie);
  }

  #getBaseCommit() {
    return Effect.gen({ self: this }, function* () {
      const repository = yield* Effect.tryPromise(() =>
        this.#octokit.repos.get({
          owner: this.#config.username,
          repo: this.#config.repository,
        }),
      );
      const { branch, branchExists } = yield* Effect.tryPromise(() =>
        this.#octokit.repos
          .getBranch({
            branch: this.#config.branch,
            owner: this.#config.username,
            repo: this.#config.repository,
          })
          .then((branch) => ({ branch, branchExists: true as const }))
          .catch(async (error: unknown) => {
            if (
              typeof error !== "object" ||
              error === null ||
              !("status" in error) ||
              error.status !== 404
            ) {
              throw error;
            }
            const branch = await this.#octokit.repos.getBranch({
              branch: repository.data.default_branch,
              owner: this.#config.username,
              repo: this.#config.repository,
            });
            return { branch, branchExists: false as const };
          }),
      );

      return {
        branchExists,
        branchName: this.#config.branch,
        commitSha: branch.data.commit.sha,
      };
    });
  }

  #listFiles(
    directory: AbsoluteDir,
  ): Effect.Effect<
    LocalFile[],
    PlatformError.PlatformError,
    FileSystem.FileSystem
  > {
    return this.#visitDirectory(directory, "");
  }

  #visitDirectory(
    directory: AbsoluteDir,
    relativeDirectory: string,
    files: LocalFile[] = [],
  ): Effect.Effect<
    LocalFile[],
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
