import * as fsp from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";

import { Progress } from "@liqvid/renderer";
import type { ProviderConfigGitHubPages } from "@liqvid/schemas";
import { Effect, Schedule } from "effect";
import {
  AbsoluteDir,
  type AbsoluteFile,
  RelativeDir,
  RelativeFile,
} from "effect-paths";
import { execa } from "execa";

import type { ProgressService } from "../types.mts";

export type GitHubPagesLocalFile = Readonly<{
  key: RelativeFile;
  path: AbsoluteFile;
}>;

const PUBLISH_CONCURRENCY = 5;

export function publishGitHubPages(
  config: ProviderConfigGitHubPages,
  token: string,
  files: readonly GitHubPagesLocalFile[],
): Effect.Effect<void, unknown, ProgressService> {
  return Effect.gen(function* () {
    const filesToPublish = files.filter(({ key }) => key !== ".nojekyll");
    const publicationDirectory = config.directory === "/docs" ? "docs" : ".";
    const tempDir = AbsoluteDir(
      yield* Effect.tryPromise(() =>
        fsp.mkdtemp(path.join(tmpdir(), "liqvid-github-pages-")),
      ),
    );
    const remote = `https://github.com/${config.username}/${config.repository}.git`;
    const auth = Buffer.from(`x-access-token:${token}`).toString("base64");
    const gitEnv = {
      ...process.env,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
      GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${auth}`,
      GIT_TERMINAL_PROMPT: "0",
    };
    const runGit = (args: string[]) =>
      Effect.tryPromise({
        catch: (cause) => new Error(`git ${args[0]} failed`, { cause }),
        try: () => execa("git", args, { cwd: tempDir, env: gitEnv }),
      });

    yield* Effect.gen(function* () {
      const refs = yield* runGit([
        "ls-remote",
        "--symref",
        remote,
        "HEAD",
        `refs/heads/${config.branch}`,
      ]);
      const defaultBranch = refs.stdout.match(
        /^ref: refs\/heads\/(.+)\tHEAD$/m,
      )?.[1];
      if (!defaultBranch) {
        return yield* Effect.die(
          new Error("Could not determine default branch"),
        );
      }

      const branchRef = `refs/heads/${config.branch}`;
      const branchExists = refs.stdout
        .split(/\r?\n/)
        .some((line) => line.endsWith(`\t${branchRef}`));
      const baseRef = branchExists ? branchRef : `refs/heads/${defaultBranch}`;

      yield* runGit(["init", "--quiet"]);
      yield* runGit(["remote", "add", "origin", remote]);
      yield* runGit(["fetch", "--depth=1", "origin", baseRef]);
      yield* runGit(["checkout", "--quiet", "-B", config.branch, "FETCH_HEAD"]);
      yield* runGit([
        "rm",
        "--quiet",
        "-r",
        "--ignore-unmatch",
        "--",
        publicationDirectory,
      ]);
      yield* runGit(["clean", "-fdx", "--", publicationDirectory]);

      const publishDir =
        config.directory === "/docs"
          ? path.join(tempDir, RelativeDir("docs"))
          : tempDir;

      yield* Effect.all(
        filesToPublish.map(({ key, path: source }) =>
          Effect.tryPromise(async () => {
            const destination = path.join(publishDir, key);
            await fsp.mkdir(path.dirname(destination), { recursive: true });
            await fsp.copyFile(source, destination);
          }),
        ),
        { concurrency: PUBLISH_CONCURRENCY },
      );
      yield* Effect.tryPromise(() =>
        fsp.writeFile(path.join(publishDir, RelativeFile(".nojekyll")), ""),
      );
      yield* runGit(["add", "--all"]);

      const status = yield* runGit([
        "status",
        "--porcelain",
        "--untracked-files=all",
      ]);
      const hasChanges = status.stdout.length > 0;
      if (!hasChanges && branchExists) {
        yield* Effect.log("GitHub Pages content is already up to date.");
        return;
      }

      if (hasChanges) {
        yield* runGit([
          "-c",
          `user.name=${config.username}`,
          "-c",
          `user.email=${config.username}@users.noreply.github.com`,
          "commit",
          "--quiet",
          "-m",
          "Publish Liqvid site",
        ]);
      }

      const { SingleBar } = yield* Progress;
      const progress = new SingleBar({ formatValue: (value) => `${value}%` });
      progress.start(100, 0);
      yield* Effect.gen(function* () {
        let stderr = "";
        let attempt = 0;
        yield* Effect.tryPromise({
          catch: (cause) => cause,
          try: () => {
            const subprocess = execa(
              "git",
              ["push", "--progress", "origin", `HEAD:${branchRef}`],
              { cwd: tempDir, env: gitEnv },
            );
            stderr = "";
            if (attempt++ > 0) {
              progress.update(0);
            }
            subprocess.stderr?.on("data", (chunk: Buffer) => {
              stderr = `${stderr}${chunk.toString()}`.slice(-512);
              for (const match of stderr.matchAll(
                /Writing objects:\s*(\d+)%/g,
              )) {
                progress.update(Number(match[1]));
              }
            });
            return subprocess;
          },
        }).pipe(
          Effect.retry({
            schedule: Schedule.exponential("1 second"),
            times: 3,
            while: (error) =>
              typeof error === "object" &&
              error !== null &&
              "stderr" in error &&
              /\b5\d{2}\b/.test(String(error.stderr)),
          }),
          Effect.mapError(
            (cause) => new Error("GitHub Pages push failed", { cause }),
          ),
        );
        progress.update(100);
      }).pipe(Effect.ensuring(Effect.sync(() => progress.stop())));

      yield* Effect.log(
        `Published ${filesToPublish.length} files to ${config.username}/${config.repository}:${config.branch}`,
      );
    }).pipe(
      Effect.ensuring(
        Effect.tryPromise(() =>
          fsp.rm(tempDir, { force: true, recursive: true }),
        ).pipe(Effect.orElseSucceed(() => undefined)),
      ),
    );
  });
}
