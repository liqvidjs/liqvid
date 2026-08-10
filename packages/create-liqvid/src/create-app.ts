import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import retry from "async-retry";
import type { AbsoluteDir, RelativeDir, RelativeFile } from "effect-paths";
import pico from "picocolors";

import type { Bundler, TemplateType } from "../templates/index.mts";
import { getTemplateFile, installTemplate } from "../templates/index.mts";

import { runBiome } from "./helpers/biome.ts";
import type { RepoInfo } from "./helpers/examples.ts";
import {
  downloadAndExtractExample,
  downloadAndExtractRepo,
  existsInRepo,
  getRepoInfo,
  hasRepo,
} from "./helpers/examples.ts";
import { generateAgentFiles } from "./helpers/generate-agent-files.ts";
import type { PackageManager } from "./helpers/get-pkg-manager.ts";
import { tryGitInit } from "./helpers/git.ts";
import { install } from "./helpers/install.ts";
import { isFolderEmpty } from "./helpers/is-folder-empty.ts";
import { getOnline } from "./helpers/is-online.ts";
import { isWriteable } from "./helpers/is-writeable.ts";
import { runTypegen } from "./helpers/typegen.ts";
import { type PresetName, presetTitle } from "./presets.ts";

export class DownloadError extends Error {}

export async function createApp({
  appPath,
  packageManager,
  example,
  examplePath,
  tailwind,
  skipInstall,
  empty,
  bundler,
  disableGit,
  reactCompiler,
  portless,
  agentsMd,
  presets,
}: {
  appPath: string;
  packageManager: PackageManager;
  example?: string;
  examplePath?: string;
  typescript: boolean;
  tailwind: boolean;
  skipInstall: boolean;
  empty: boolean;
  bundler: Bundler;
  disableGit?: boolean;
  reactCompiler: boolean;
  portless: boolean;
  agentsMd: boolean;
  /** The presets that were selected. */
  presets?: PresetName[];
}): Promise<void> {
  let repoInfo: RepoInfo | undefined;
  const template =
    `app${tailwind ? "-tw" : ""}${empty ? "-empty" : ""}` as RelativeDir<TemplateType>;

  if (example) {
    let repoUrl: URL | undefined;

    try {
      repoUrl = new URL(example);
    } catch (error: unknown) {
      const err = error as Error;
      // TypeError is thrown when the URL is invalid. Equivalent of doing `err.code !== "ERR_INVALID_URL"` in Node.js
      if (!(err instanceof TypeError)) {
        console.error(error);
        process.exit(1);
      }
    }

    if (repoUrl) {
      if (repoUrl.origin !== "https://github.com") {
        console.error(
          `Invalid URL: ${pico.red(
            `"${example}"`,
          )}. Only GitHub repositories are supported. Please use a GitHub URL and try again.`,
        );
        process.exit(1);
      }

      repoInfo = await getRepoInfo(repoUrl, examplePath);

      if (!repoInfo) {
        console.error(
          `Found invalid GitHub URL: ${pico.red(
            `"${example}"`,
          )}. Please fix the URL and try again.`,
        );
        process.exit(1);
      }

      const found = await hasRepo(repoInfo);

      if (!found) {
        console.error(
          `Could not locate the repository for ${pico.red(
            `"${example}"`,
          )}. Please check that the repository exists and try again.`,
        );
        process.exit(1);
      }
    } else if (example !== "__internal-testing-retry") {
      const found = await existsInRepo(example);

      if (!found) {
        console.error(
          `Could not locate an example named ${pico.red(
            `"${example}"`,
          )}. It could be due to the following:\n`,
          `1. Your spelling of example ${pico.red(
            `"${example}"`,
          )} might be incorrect.\n`,
          `2. You might not be connected to the internet or you are behind a proxy.`,
        );
        process.exit(1);
      }
    }
  }

  const root = resolve(appPath) as AbsoluteDir;

  if (!(await isWriteable(dirname(root)))) {
    console.error(
      "The application path is not writable, please check folder permissions and try again.",
    );
    console.error(
      "It is likely you do not have write permissions for this folder.",
    );
    process.exit(1);
  }

  const appName = basename(root);

  mkdirSync(root, { recursive: true });
  if (!isFolderEmpty(root, appName)) {
    process.exit(1);
  }

  const useYarn = packageManager === "yarn";
  const isOnline = !useYarn || (await getOnline());
  const originalDirectory = process.cwd();

  console.log(`Creating a new Next.js app in ${pico.green(root)}.`);
  console.log();

  process.chdir(root);

  const packageJsonPath = join(root, "package.json" as RelativeFile);
  let hasPackageJson = false;

  if (example) {
    /**
     * If an example repository is provided, clone it.
     */
    try {
      if (repoInfo) {
        const repoInfo2 = repoInfo;
        console.log(
          `Downloading files from repo ${pico.cyan(
            example,
          )}. This might take a moment.`,
        );
        console.log();
        await retry(() => downloadAndExtractRepo(root, repoInfo2), {
          retries: 3,
        });
      } else {
        console.log(
          `Downloading files for example ${pico.cyan(
            example,
          )}. This might take a moment.`,
        );
        console.log();
        await retry(() => downloadAndExtractExample(root, example), {
          retries: 3,
        });
      }
    } catch (reason) {
      function isErrorLike(err: unknown): err is { message: string } {
        return (
          typeof err === "object" &&
          err !== null &&
          typeof (err as { message?: unknown }).message === "string"
        );
      }
      throw new DownloadError(
        isErrorLike(reason) ? reason.message : reason + "",
      );
    }
    // Copy `.gitignore` if the application did not provide one
    const ignorePath = join(root, ".gitignore" as RelativeFile);
    if (!existsSync(ignorePath)) {
      copyFileSync(
        getTemplateFile({ file: "gitignore" as RelativeFile, template }),
        ignorePath,
      );
    }

    // Copy `next-env.d.ts` to any example that is typescript
    const tsconfigPath = join(root, "tsconfig.json" as RelativeFile);
    if (existsSync(tsconfigPath)) {
      copyFileSync(
        getTemplateFile({ file: "next-env.d.ts" as RelativeFile, template }),
        join(root, "next-env.d.ts" as RelativeFile),
      );
    }

    hasPackageJson = existsSync(packageJsonPath);
    if (!skipInstall && hasPackageJson) {
      console.log("Installing packages. This might take a couple of minutes.");
      console.log();

      await install(packageManager, isOnline);
      console.log();
      try {
        console.log();
        await runBiome(packageManager);
        console.log();
      } catch (err) {
        // Best effort: do not fail app creation if Biome fails
        console.error("Error running Biome:", err);
      }
      try {
        console.log();
        await runTypegen(packageManager);
        console.log();
      } catch (err) {
        // Best effort: do not fail app creation if typegen fails
        console.error("Error running typegen:", err);
      }
    }
  } else {
    /**
     * If an example repository is not provided for cloning, proceed
     * by installing from a template.
     */
    await installTemplate({
      appName,
      bundler,
      isOnline,
      packageManager,
      portless,
      presets,
      reactCompiler,
      root,
      skipInstall,
      tailwind,
      template,
    });
  }

  // Show the presets that were included, after the dependency install output.
  if (presets && presets.length > 0) {
    console.log(`Included ${pico.bold("presets")}:`);
    for (const preset of presets) {
      console.log(`  ${pico.green("+")} ${presetTitle(preset)}`);
    }
    console.log();
  }

  if (agentsMd) {
    generateAgentFiles(root);
  }

  if (disableGit) {
    console.log("Skipping git initialization.");
    console.log();
  } else if (tryGitInit(root)) {
    console.log("Initialized a git repository.");
    console.log();
  }

  let cdpath: string;
  if (join(originalDirectory, appName) === appPath) {
    cdpath = appName;
  } else {
    cdpath = appPath;
  }

  console.log(`${pico.green("Success!")} Created ${appName} at ${appPath}`);

  if (hasPackageJson) {
    console.log("Inside that directory, you can run several commands:");
    console.log();
    console.log(pico.cyan(`  ${packageManager} ${useYarn ? "" : "run "}dev`));
    console.log("    Starts the development server.");
    console.log();
    console.log(pico.cyan(`  ${packageManager} ${useYarn ? "" : "run "}build`));
    console.log("    Builds the app for production.");
    console.log();
    console.log(pico.cyan(`  ${packageManager} start`));
    console.log("    Runs the built app in production mode.");
    console.log();
    console.log("We suggest that you begin by typing:");
    console.log();
    console.log(pico.cyan("  cd"), cdpath);
    console.log(
      `  ${pico.cyan(`${packageManager} ${useYarn ? "" : "run "}dev`)}`,
    );
  }
  console.log();
}
