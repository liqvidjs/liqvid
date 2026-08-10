#!/usr/bin/env node
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import ciInfo from "ci-info";
import { Command } from "commander";
import Conf from "conf";
import pico from "picocolors";
import type { InitialReturnValue } from "prompts";
import prompts from "prompts";
import updateCheck from "update-check";

import { Bundler } from "../templates/index.mts";

import { createApp, DownloadError } from "./create-app.ts";
import type { PackageManager } from "./helpers/get-pkg-manager.ts";
import { getPkgManager } from "./helpers/get-pkg-manager.ts";
import { isFolderEmpty } from "./helpers/is-folder-empty.ts";
import type { TreeCategory } from "./helpers/tree-select.ts";
import { treeSelect } from "./helpers/tree-select.ts";
import { validateNpmName } from "./helpers/validate-pkg.ts";
import { isPresetName, type PresetName } from "./presets.ts";

import packageJson from "../package.json" with { type: "json" };

/**
 * The nested tree of presets offered during project creation. Categories with
 * `children` can be toggled as a whole or item-by-item; categories without
 * children behave as a single togglable option. Each `value` must be a valid
 * preset id from {@link PRESETS}.
 */
const PRESET_TREE: TreeCategory[] = [
  {
    children: [
      { title: "vanilla HTML", value: "coding-html" },
      { title: "TypeScript-React (TSX)", value: "coding-tsx" },
      { title: "Python", value: "coding-python" },
      { title: "Shaders", value: "coding-shaders" },
    ],
    title: "Coding",
  },
  // {
  //   title: "Handwriting (tldraw)",
  //   value: "tldraw",
  // },
  // {
  //   title: "Slideshow",
  //   value: "slides",
  // },
  // {
  //   children: [
  //     { title: "equations", value: "math-equations" },
  //     { title: "2d graphics", value: "math-2d" },
  //     { title: "3d graphics", value: "math-3d" },
  //     { title: "Desmos", value: "math-desmos" },
  //     { title: "commutative diagrams", value: "math-diagrams" },
  //   ],
  //   title: "Math",
  // },
];

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
  .option(
    "--portless",
    "Set up the project to use Portless for local development. (default)",
  )
  .option("--app", "Initialize as an App Router project.")
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
  .option("--no-presets", "Skip the preset selection prompt.")
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
        `  ${pico.cyan(opts.name())} ${pico.green("<project-directory>")}\n` +
        "For example:\n" +
        `  ${pico.cyan(opts.name())} ${pico.green("my-next-app")}\n\n` +
        `Run ${pico.cyan(`${opts.name()} --help`)} to see all options.`,
    );
    process.exit(1);
  }

  const appPath = resolve(projectPath);
  const appName = basename(appPath);

  const validation = validateNpmName(appName);
  if (!validation.valid) {
    console.error(
      `Could not create a project called ${pico.red(
        `"${appName}"`,
      )} because of npm naming restrictions:`,
    );

    validation.problems.forEach((p) => {
      console.error(`    ${pico.red(pico.bold("*"))} ${p}`);
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
      disableGit: false,
      empty: false,
      importAlias: "@/*",
      portless: true,
      reactCompiler: true,
      tailwind: true,
    };

    type DisplayConfigItem = {
      key: keyof typeof defaults;
      values?: Record<string, string>;
    };

    const displayConfig: DisplayConfigItem[] = [
      { key: "reactCompiler", values: { true: "React Compiler" } },
      // { key: "tailwind", values: { true: "Tailwind CSS" } },
      { key: "portless", values: { true: "Portless" } },
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
        const styledReactCompiler = pico.blue("React Compiler");
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

    if (!opts.portless && !args.includes("--no-portless")) {
      if (skipPrompt) {
        opts.portless = getPrefOrDefault("portless");
      } else {
        const styledPortless = pico.blue("Portless");
        const { portless } = await prompts({
          active: "Yes",
          inactive: "No",
          initial: getPrefOrDefault("portless"),
          message: `Would you like to use ${styledPortless}?`,
          name: "portless",
          onState: onPromptState,
          type: "toggle",
        });
        opts.portless = Boolean(portless);
        preferences.portless = Boolean(portless);
      }
    }

    if (!opts.tailwind && !args.includes("--no-tailwind")) {
      if (skipPrompt) {
        opts.tailwind = getPrefOrDefault("tailwind");
      } else {
        const tw = pico.blue("Tailwind CSS");
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

  // Preset selection is a distinct step, run after the settings customization
  // above. These are organized as a nested tree: categories can be toggled as
  // a whole, and individual items can be toggled independently. All presets
  // are selected by default.
  if (!example) {
    if (args.includes("--no-presets")) {
      opts.presets = [];
    } else {
      // Default to everything selected. If the user has saved preferences from
      // a previous run, honor those instead.
      const savedPresets = preferences.presets;
      const hasSavedPresets = typeof savedPresets === "string";
      const savedSet = new Set(
        hasSavedPresets ? savedPresets.split(",").filter(Boolean) : [],
      );

      const isSelected = (value: string | undefined) => {
        if (value === undefined) return false;
        return hasSavedPresets ? savedSet.has(value) : true;
      };

      if (skipPrompt) {
        // Collect the selected values without prompting.
        const values: string[] = [];
        for (const cat of PRESET_TREE) {
          if (cat.children && cat.children.length > 0) {
            for (const child of cat.children) {
              if (isSelected(child.value)) values.push(child.value);
            }
          } else if (isSelected(cat.value)) {
            values.push(cat.value!);
          }
        }
        opts.presets = values;
      } else {
        const categories = PRESET_TREE.map((cat) => ({
          ...cat,
          children: cat.children?.map((child) => ({
            ...child,
            selected: isSelected(child.value),
          })),
          selected: isSelected(cat.value),
        }));

        const presets = await treeSelect({
          categories,
          message: "Which presets would you like to include?",
        });

        if (presets === undefined) {
          console.error("Exiting.");
          process.exit(1);
        }

        opts.presets = presets;
        preferences.presets = presets.join(",");
      }
    }
  }

  const bundler: Bundler = opts.rspack ? Bundler.Rspack : Bundler.Turbopack;

  try {
    await createApp({
      agentsMd: opts.agentsMd,
      appPath,
      bundler,
      disableGit: opts.disableGit,
      empty: opts.empty,
      example: example && example !== "default" ? example : undefined,
      examplePath: opts.examplePath,
      packageManager,
      portless: opts.portless,
      presets: ((opts.presets ?? []) as string[]).filter(
        isPresetName,
      ) as PresetName[],
      reactCompiler: opts.reactCompiler,
      skipInstall: opts.skipInstall,
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
      bundler,
      disableGit: opts.disableGit,
      empty: opts.empty,
      packageManager,
      portless: opts.portless,
      reactCompiler: opts.reactCompiler,
      skipInstall: opts.skipInstall,
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

// @ts-expect-error CJS vs ESM
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
        pico.yellow(
          pico.bold("A new version of `create-liqvid` is available!"),
        ) +
          "\n" +
          "You can update by running: " +
          pico.cyan(updateMessage) +
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
    console.log(`  ${pico.cyan(reason.command)} has failed.`);
  } else {
    console.log(
      pico.red("Unexpected error. Please report it as a bug:") + "\n",
      reason,
    );
  }
  console.log();
  await notifyUpdate();
  process.exit(1);
}

run().then(notifyUpdate).catch(exit);
