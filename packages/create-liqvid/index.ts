#!/usr/bin/env node
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import ciInfo from "ci-info";
import { Command } from "commander";
import Conf from "conf";
import { blue, bold, cyan, green, red, yellow } from "picocolors";
import type { InitialReturnValue } from "prompts";
import prompts from "prompts";
import updateCheck from "update-check";

import { createApp, DownloadError } from "./create-app";
import type { PackageManager } from "./helpers/get-pkg-manager";
import { getPkgManager } from "./helpers/get-pkg-manager";
import { isFolderEmpty } from "./helpers/is-folder-empty";
import { validateNpmName } from "./helpers/validate-pkg";
import { Bundler } from "./templates";

import packageJson from "./package.json";

let projectPath: string = "";

const handleSigTerm = () => process.exit(0);

process.on("SIGINT", handleSigTerm);
process.on("SIGTERM", handleSigTerm);

const onPromptState = (state: {
  value: InitialReturnValue;
  aborted: boolean;
  exited: boolean;
}) => {
  if (state.aborted) {
    // If we don't re-enable the terminal cursor before exiting
    // the program, the cursor will remain hidden
    process.stdout.write("\x1B[?25h");
    process.stdout.write("\n");
    process.exit(1);
  }
};

const program = new Command(packageJson.name)
  .version(
    packageJson.version,
    "-v, --version",
    "Output the current version of create-liqvid.",
  )
  .argument("[directory]")
  .usage("[directory] [options]")
  .helpOption("-h, --help", "Display this help message.")
  .option("--tailwind", "Initialize with Tailwind CSS config. (default)")
  .option("--react-compiler", "Initialize with React Compiler enabled.")
  .option("--app", "Initialize as an App Router project.")
  .option("--src-dir", "Initialize inside a 'src/' directory.")
  .option("--rspack", "Enable Rspack as the bundler.")
  .option(
    "--import-alias <prefix/*>",
    'Specify import alias to use (default "@/*").',
  )
  .option("--empty", "Initialize an empty project.")
  .option(
    "--use-npm",
    "Explicitly tell the CLI to bootstrap the application using npm.",
  )
  .option(
    "--use-pnpm",
    "Explicitly tell the CLI to bootstrap the application using pnpm.",
  )
  .option(
    "--use-yarn",
    "Explicitly tell the CLI to bootstrap the application using Yarn.",
  )
  .option(
    "--use-bun",
    "Explicitly tell the CLI to bootstrap the application using Bun.",
  )
  .option(
    "--reset, --reset-preferences",
    "Reset the preferences saved for create-liqvid.",
  )
  .option(
    "--skip-install",
    "Explicitly tell the CLI to skip installing packages.",
  )
  .option("--yes", "Use saved preferences or defaults for unprovided options.")
  .option(
    "-e, --example <example-name|github-url>",
    `

  An example to bootstrap the app with. You can use an example name
  from the official Next.js repo or a public GitHub URL. The URL can use
  any branch and/or subdirectory.
`,
  )
  .option(
    "--example-path <path-to-example>",
    `

  In a rare case, your GitHub URL might contain a branch name with
  a slash (e.g. bug/fix-1) and the path to the example (e.g. foo/bar).
  In this case, you must specify the path to the example separately:
  --example-path foo/bar
`,
  )
  .option(
    "--agents-md",
    "Include AGENTS.md to guide coding agents to write up-to-date Next.js code. (default)",
  )
  .option("--disable-git", `Skip initializing a git repository.`)
  .action((name) => {
    // Commander does not implicitly support negated options. When they are used
    // by the user they will be interpreted as the positional argument (name) in
    // the action handler. See https://github.com/tj/commander.js/pull/1355
    if (name && !name.startsWith("--no-")) {
      projectPath = name;
    }
  })
  .allowUnknownOption()
  .parse(process.argv);

const opts = program.opts();
const { args } = program;

const packageManager: PackageManager = opts.useNpm
  ? "npm"
  : opts.usePnpm
    ? "pnpm"
    : opts.useYarn
      ? "yarn"
      : opts.useBun
        ? "bun"
        : getPkgManager();

async function run(): Promise<void> {
  const conf = new Conf({ projectName: "create-liqvid" });

  if (opts.resetPreferences) {
    const { resetPreferences } = await prompts({
      active: "Yes",
      inactive: "No",
      initial: false,
      message: "Would you like to reset the saved preferences?",
      name: "resetPreferences",
      onState: onPromptState,
      type: "toggle",
    });
    if (resetPreferences) {
      conf.clear();
      console.log("The preferences have been reset successfully!");
    }
    process.exit(0);
  }

  if (typeof projectPath === "string") {
    projectPath = projectPath.trim();
  }

  if (!projectPath) {
    const res = await prompts({
      initial: "my-app",
      message: "What is your project named?",
      name: "path",
      onState: onPromptState,
      type: "text",
      validate: (name) => {
        const validation = validateNpmName(basename(resolve(name)));
        if (validation.valid) {
          return true;
        }
        return "Invalid project name: " + validation.problems[0];
      },
    });

    if (typeof res.path === "string") {
      projectPath = res.path.trim();
    }
  }

  if (!projectPath) {
    console.log(
      "\nPlease specify the project directory:\n" +
        `  ${cyan(opts.name())} ${green("<project-directory>")}\n` +
        "For example:\n" +
        `  ${cyan(opts.name())} ${green("my-next-app")}\n\n` +
        `Run ${cyan(`${opts.name()} --help`)} to see all options.`,
    );
    process.exit(1);
  }

  const appPath = resolve(projectPath);
  const appName = basename(appPath);

  const validation = validateNpmName(appName);
  if (!validation.valid) {
    console.error(
      `Could not create a project called ${red(
        `"${appName}"`,
      )} because of npm naming restrictions:`,
    );

    validation.problems.forEach((p) => {
      console.error(`    ${red(bold("*"))} ${p}`);
    });
    process.exit(1);
  }

  if (opts.example === true) {
    console.error(
      "Please provide an example name or url, otherwise remove the example option.",
    );
    process.exit(1);
  }

  if (existsSync(appPath) && !isFolderEmpty(appPath, appName)) {
    process.exit(1);
  }

  const example = typeof opts.example === "string" && opts.example.trim();
  const preferences = (conf.get("preferences") || {}) as Record<
    string,
    boolean | string
  >;

  /**
   * If the user does not provide the necessary flags, prompt them for their
   * preferences, unless `--yes` option was specified, or when running in CI.
   */
  let skipPrompt = ciInfo.isCI || opts.yes;
  let useRecommendedDefaults = false;

  if (!example) {
    const defaults: typeof preferences = {
      agentsMd: true,
      app: true,
      customizeImportAlias: false,
      disableGit: false,
      empty: false,
      eslint: false,
      importAlias: "@/*",
      linter: "biome",
      reactCompiler: true,
      srcDir: false,
      tailwind: true,
    };

    type DisplayConfigItem = {
      key: keyof typeof defaults;
      values?: Record<string, string>;
    };

    const displayConfig: DisplayConfigItem[] = [
      { key: "reactCompiler", values: { true: "React Compiler" } },
      { key: "tailwind", values: { true: "Tailwind CSS" } },
      { key: "srcDir", values: { true: "src/ dir" } },
      { key: "agentsMd", values: { true: "AGENTS.md" } },
    ];

    // Helper to format settings for display based on displayConfig
    const formatSettingsDescription = (
      settings: Record<string, boolean | string>,
    ) => {
      const descriptions: string[] = [];

      for (const config of displayConfig) {
        const value = settings[config.key];

        if (config.values) {
          // Look up the display label for this value
          const label = config.values[String(value)];
          if (label) {
            descriptions.push(label);
          }
        }
      }

      return descriptions.join(", ");
    };

    // Check if we have saved preferences
    const hasSavedPreferences = Object.keys(preferences).length > 0;

    // Check if user provided any configuration flags
    // If they did, skip the "recommended defaults" prompt and go straight to
    // individual prompts for any missing options
    const hasProvidedOptions = process.argv.some((arg) => arg.startsWith("--"));

    // Only show the "recommended defaults" prompt if:
    // - Not in CI and not using --yes flag
    // - User hasn't provided any custom options
    if (!skipPrompt && !hasProvidedOptions) {
      const choices: Array<{
        title: string;
        value: string;
        description?: string;
      }> = [
        {
          description: formatSettingsDescription(defaults),
          title: "Yes, use recommended defaults",
          value: "recommended",
        },
        {
          description: "Choose your own preferences",
          title: "No, customize settings",
          value: "customize",
        },
      ];

      // Add "reuse previous settings" option if we have saved preferences
      if (hasSavedPreferences) {
        const prefDescription = formatSettingsDescription(preferences);
        choices.splice(1, 0, {
          description: prefDescription,
          title: "No, reuse previous settings",
          value: "reuse",
        });
      }

      const { setupChoice } = await prompts(
        {
          choices,
          initial: 0,
          message: "Would you like to use the recommended Liqvid defaults?",
          name: "setupChoice",
          type: "select",
        },
        {
          onCancel: () => {
            console.error("Exiting.");
            process.exit(1);
          },
        },
      );

      if (setupChoice === "recommended") {
        useRecommendedDefaults = true;
        skipPrompt = true;
      } else if (setupChoice === "reuse") {
        skipPrompt = true;
      }
    }

    // If using recommended defaults, populate preferences with defaults
    // This ensures they are saved for reuse next time
    if (useRecommendedDefaults) {
      Object.assign(preferences, defaults);
    }

    const getPrefOrDefault = (field: string) => {
      // If using recommended defaults, always use hardcoded defaults
      if (useRecommendedDefaults) {
        return defaults[field];
      }

      // If not using the recommended template, we prefer saved preferences, otherwise defaults.
      return preferences[field] ?? defaults[field];
    };

    if (!opts.reactCompiler && !args.includes("--no-react-compiler")) {
      if (skipPrompt) {
        opts.reactCompiler = getPrefOrDefault("reactCompiler");
      } else {
        const styledReactCompiler = blue("React Compiler");
        const { reactCompiler } = await prompts({
          active: "Yes",
          inactive: "No",
          initial: getPrefOrDefault("reactCompiler"),
          message: `Would you like to use ${styledReactCompiler}?`,
          name: "reactCompiler",
          onState: onPromptState,
          type: "toggle",
        });
        opts.reactCompiler = Boolean(reactCompiler);
        preferences.reactCompiler = Boolean(reactCompiler);
      }
    }

    if (!opts.tailwind && !args.includes("--no-tailwind")) {
      if (skipPrompt) {
        opts.tailwind = getPrefOrDefault("tailwind");
      } else {
        const tw = blue("Tailwind CSS");
        const { tailwind } = await prompts({
          active: "Yes",
          inactive: "No",
          initial: getPrefOrDefault("tailwind"),
          message: `Would you like to use ${tw}?`,
          name: "tailwind",
          onState: onPromptState,
          type: "toggle",
        });
        opts.tailwind = Boolean(tailwind);
        preferences.tailwind = Boolean(tailwind);
      }
    }

    if (!opts.srcDir && !args.includes("--no-src-dir")) {
      if (skipPrompt) {
        opts.srcDir = getPrefOrDefault("srcDir");
      } else {
        const styledSrcDir = blue("`src/` directory");
        const { srcDir } = await prompts({
          active: "Yes",
          inactive: "No",
          initial: getPrefOrDefault("srcDir"),
          message: `Would you like your code inside a ${styledSrcDir}?`,
          name: "srcDir",
          onState: onPromptState,
          type: "toggle",
        });
        opts.srcDir = Boolean(srcDir);
        preferences.srcDir = Boolean(srcDir);
      }
    }

    const importAliasPattern = /^[^*"]+\/\*\s*$/;
    if (
      typeof opts.importAlias !== "string" ||
      !importAliasPattern.test(opts.importAlias)
    ) {
      if (skipPrompt) {
        // We don't use preferences here because the default value is @/* regardless of existing preferences
        opts.importAlias = defaults.importAlias;
      } else if (args.includes("--no-import-alias")) {
        opts.importAlias = defaults.importAlias;
      } else {
        const styledImportAlias = blue("import alias");

        const { customizeImportAlias } = await prompts({
          active: "Yes",
          inactive: "No",
          initial: getPrefOrDefault("customizeImportAlias"),
          message: `Would you like to customize the ${styledImportAlias} (\`${defaults.importAlias}\` by default)?`,
          name: "customizeImportAlias",
          onState: onPromptState,
          type: "toggle",
        });

        if (!customizeImportAlias) {
          // We don't use preferences here because the default value is @/* regardless of existing preferences
          opts.importAlias = defaults.importAlias;
        } else {
          const { importAlias } = await prompts({
            initial: getPrefOrDefault("importAlias"),
            message: `What ${styledImportAlias} would you like configured?`,
            name: "importAlias",
            onState: onPromptState,
            type: "text",
            validate: (value) =>
              importAliasPattern.test(value)
                ? true
                : "Import alias must follow the pattern <prefix>/*",
          });
          opts.importAlias = importAlias;
          preferences.importAlias = importAlias;
        }
      }
    }

    if (args.includes("--no-agents-md")) {
      opts.agentsMd = false;
    } else if (!opts.agentsMd) {
      if (skipPrompt) {
        opts.agentsMd = getPrefOrDefault("agentsMd");
      } else {
        const { agentsMd } = await prompts(
          {
            active: "Yes",
            inactive: "No",
            initial: getPrefOrDefault("agentsMd"),
            message:
              "Would you like to include AGENTS.md to guide coding agents to write up-to-date Next.js and Liqvid code?",
            name: "agentsMd",
            type: "toggle",
          },
          {
            onCancel: () => {
              console.error("Exiting.");
              process.exit(1);
            },
          },
        );
        opts.agentsMd = Boolean(agentsMd);
        preferences.agentsMd = Boolean(agentsMd);
      }
    }
  }

  const bundler: Bundler = opts.rspack ? Bundler.Rspack : Bundler.Turbopack;

  try {
    await createApp({
      agentsMd: opts.agentsMd,
      appPath,
      biome: true,
      bundler,
      disableGit: opts.disableGit,
      empty: opts.empty,
      eslint: false,
      example: example && example !== "default" ? example : undefined,
      examplePath: opts.examplePath,
      importAlias: opts.importAlias,
      packageManager,
      reactCompiler: opts.reactCompiler,
      skipInstall: opts.skipInstall,
      srcDir: opts.srcDir,
      tailwind: opts.tailwind,
      typescript: true,
    });
  } catch (reason) {
    if (!(reason instanceof DownloadError)) {
      throw reason;
    }

    const res = await prompts({
      initial: true,
      message:
        `Could not download "${example}" because of a connectivity issue between your machine and GitHub.\n` +
        `Do you want to use the default template instead?`,
      name: "builtin",
      onState: onPromptState,
      type: "confirm",
    });
    if (!res.builtin) {
      throw reason;
    }

    await createApp({
      agentsMd: opts.agentsMd,
      appPath,
      biome: true,
      bundler,
      disableGit: opts.disableGit,
      empty: opts.empty,
      eslint: false,
      importAlias: opts.importAlias,
      packageManager,
      reactCompiler: opts.reactCompiler,
      skipInstall: opts.skipInstall,
      srcDir: opts.srcDir,
      tailwind: opts.tailwind,
      typescript: true,
    });
  }
  conf.set("preferences", preferences);
}

// Determine the appropriate dist-tag to check for updates.
// For prerelease versions like "16.1.1-canary.32", extract "canary" and check
// against that dist-tag. This ensures canary users are notified about newer
// canary releases, not incorrectly prompted to "update" to stable.
function getDistTag(version: string): string {
  const prereleaseMatch = version.match(/-([a-z]+)/);
  return prereleaseMatch ? prereleaseMatch[1] : "latest";
}

const update = updateCheck(packageJson, {
  distTag: getDistTag(packageJson.version),
}).catch(() => null);

async function notifyUpdate(): Promise<void> {
  try {
    if ((await update)?.latest) {
      const global = {
        bun: "bun add -g",
        npm: "npm i -g",
        pnpm: "pnpm add -g",
        yarn: "yarn global add",
      };
      const distTag = getDistTag(packageJson.version);
      const pkgTag = distTag === "latest" ? "" : `@${distTag}`;
      const updateMessage = `${global[packageManager]} create-liqvid${pkgTag}`;
      console.log(
        yellow(bold("A new version of `create-liqvid` is available!")) +
          "\n" +
          "You can update by running: " +
          cyan(updateMessage) +
          "\n",
      );
    }
    process.exit(0);
  } catch {
    // ignore error
  }
}

async function exit(reason: { command?: string }) {
  console.log();
  console.log("Aborting installation.");
  if (reason.command) {
    console.log(`  ${cyan(reason.command)} has failed.`);
  } else {
    console.log(
      red("Unexpected error. Please report it as a bug:") + "\n",
      reason,
    );
  }
  console.log();
  await notifyUpdate();
  process.exit(1);
}

run().then(notifyUpdate).catch(exit);
