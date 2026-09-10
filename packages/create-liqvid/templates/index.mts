import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { RelativeDir, RelativeFile } from "effect-paths";
import pico from "picocolors";

import { runBiome } from "../src/helpers/biome.ts";
import { copy } from "../src/helpers/copy.ts";
import { getPnpmMajorVersion } from "../src/helpers/get-pkg-manager.ts";
import { install } from "../src/helpers/install.ts";
import { runTypegen } from "../src/helpers/typegen.ts";
import { presetDependencies, presetDevDependencies } from "../src/presets.ts";

import {
  Bundler,
  type GetTemplateFileArgs,
  type InstallTemplateArgs,
} from "./types.mts";

import versions from "../versions.json" with { type: "json" };
import versionsThirdParty from "../versions-third-party.json" with {
  type: "json",
};

const liqvidDep = (...packageNames: (keyof typeof versions)[]) =>
  Object.fromEntries(
    packageNames.map((pkg) => [`@liqvid/${pkg}`, versions[pkg]]),
  );

const thirdPartyDep = (...packageNames: (keyof typeof versionsThirdParty)[]) =>
  Object.fromEntries(packageNames.map((pkg) => [pkg, versionsThirdParty[pkg]]));

/**
 * Resolve the version range for a preset dependency by name, using the same
 * version sources as the base template. `@liqvid/*` packages are looked up in
 * `versions.json`; everything else in `versions-third-party.json`.
 *
 * @throws if the package has no pinned version in either file.
 */
const resolvePresetVersion = (name: string): string => {
  if (name.startsWith("@liqvid/")) {
    const key = name.slice("@liqvid/".length) as keyof typeof versions;
    if (key in versions) return versions[key];
  } else if (name in versionsThirdParty) {
    return versionsThirdParty[name as keyof typeof versionsThirdParty];
  }
  throw new Error(
    `No pinned version found for preset dependency "${name}". ` +
      `Add it to versions-third-party.json (or versions.json for @liqvid/* packages).`,
  );
};

const presetDeps = (names: string[] | undefined): Record<string, string> =>
  Object.fromEntries(
    (names ?? []).map((name) => [name, resolvePresetVersion(name)]),
  );

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  ignoreScripts?: string[];
  name: string;
  imports?: Record<string, string>;
  portless?: {
    name: string;
    script: string;
    appPort: number;
  };
  private?: boolean;
  scripts?: Record<string, string>;
  trustedDependencies?: string[];
  version?: string;
};

/**
 * Sanitize a project name into a valid Portless app name (lowercase
 * alphanumeric words joined by hyphens).
 */
function sanitizePortlessName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized || "app";
}

/** Generate a random port in the 3xxx range (3000–3999). */
function randomPort(): number {
  return 3000 + Math.floor(Math.random() * 1000);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sorted(obj: Record<string, string>) {
  return Object.keys(obj)
    .sort()
    .reduce((acc: Record<string, string>, key) => {
      acc[key] = obj[key];

      return acc;
    }, {});
}

/**
 * Get the file path for a given file in a template, e.g. "next.config.js".
 */
export const getTemplateFile = ({
  template,
  file,
}: GetTemplateFileArgs): string => {
  return path.join(__dirname, template, "..ts" as RelativeDir, file);
};

export const SRC_DIR_NAMES = ["app", "pages", "styles"] as RelativeDir[];

/**
 * Install a Next.js internal template to a given `root` directory.
 */
export const installTemplate = async ({
  appName,
  root,
  packageManager,
  isOnline,
  template,
  tailwind,
  skipInstall,
  bundler,
  reactCompiler,
  portless,
  presets,
}: InstallTemplateArgs) => {
  console.log(pico.bold(`Using ${packageManager}.`));

  /**
   * Copy the template files to the target directory.
   */
  const templatePath = path.join(__dirname, template, "ts" as RelativeDir);
  const copySource = ["**", "**/.browserslistrc"];
  if (!tailwind) copySource.push("!postcss.config.mjs");

  await copy(copySource, root, {
    cwd: templatePath,
    parents: true,
    rename(name) {
      switch (name) {
        case "gitignore": {
          return `.${name}`;
        }
        // README.md is ignored by webpack-asset-relocator-loader used by ncc:
        // https://github.com/vercel/webpack-asset-relocator-loader/blob/e9308683d47ff507253e37c9bcbb99474603192b/src/asset-relocator.js#L227
        case "README-template.md": {
          return "README.md";
        }
        default: {
          return name;
        }
      }
    },
  });

  /**
   * Copy each selected preset's content from `presets/{preset-name}` into the
   * target directory, layered on top of the base template.
   */
  for (const preset of presets ?? []) {
    const presetPath = path.join(
      __dirname,
      "presets" as RelativeDir,
      preset as RelativeDir,
    );
    await copy("**", root, {
      cwd: presetPath,
      parents: true,
    });
  }

  const nextConfigFile = path.join(root, "next.config.ts" as RelativeFile);
  let configContent = await fs.readFile(nextConfigFile, "utf8");
  let configChanged = false;

  if (bundler === Bundler.Rspack) {
    configContent =
      `import withRspack from "next-rspack";\n\n` +
      configContent.replace(
        "export default nextConfig;",
        "export default withRspack(nextConfig);",
      );

    configChanged = true;
  }

  if (reactCompiler) {
    configContent = configContent.replace(
      "/* config options here */\n",
      "reactCompiler: true,\n/* config options here */\n",
    );
    configChanged = true;
  }

  /** Copy the version from package.json or override for tests. */
  const bundlerFlags = bundler === Bundler.Webpack ? " --webpack" : "";

  /** Create a package.json for the new project and write it to disk. */
  // biome-ignore assist/source/useSortedKeys: we have preferred order for package.json
  const packageJson: PackageJson = {
    name: appName,
    private: true,
    portless: undefined,
    imports: {
      "#/*": "./*",
      "#components/*": "./components/*",
      "#lib/*": "./lib/*",
    },
    scripts: {
      build: `next build${bundlerFlags}`,
      dev: `next dev${bundlerFlags}`,
      format: "biome format --write",
      lint: "biome check",
      "liqvid:build": "liqvid build",
      "liqvid:publish": "liqvid publish",
      postinstall: "liqvid generate-imports",
      prepare: "next-ws patch --yes",
      start: "next start",
    },

    /**
     * Default dependencies.
     */
    dependencies: {
      ...thirdPartyDep(
        "@base-ui/react",
        "@phosphor-icons/react",
        "clsx",
        "hls.js",
        "katex",
        "next",
        "next-ws",
        "react",
        "react-dom",
        "smart-whisper",
      ),
      ...liqvidDep(
        "cli",
        "media",
        "prompts",
        "recording",
        "schemas",
        "script",
        "studio",
        "utils",
      ),
      liqvid: versions.main,
    },
    devDependencies: thirdPartyDep(
      "@biomejs/biome",
      "@types/node",
      "@types/react",
      "@types/react-dom",
      "effect-paths",
      "no-private-imports",
      "no-restricted-imports",
      "typescript",
    ),
  };

  if (bundler === Bundler.Rspack) {
    const NEXT_PRIVATE_TEST_VERSION = process.env.NEXT_PRIVATE_TEST_VERSION;
    if (
      NEXT_PRIVATE_TEST_VERSION &&
      path.isAbsolute(NEXT_PRIVATE_TEST_VERSION)
    ) {
      packageJson.dependencies!["next-rspack"] = path.resolve(
        path.dirname(NEXT_PRIVATE_TEST_VERSION),
        "../next-rspack/next-rspack-packed.tgz",
      );
    } else {
      packageJson.dependencies!["next-rspack"] = versionsThirdParty.next;
    }
  }

  if (reactCompiler) {
    packageJson.devDependencies!["babel-plugin-react-compiler"] =
      versionsThirdParty["babel-plugin-react-compiler"];
  }

  /* Set up Portless for local development. */
  if (portless) {
    packageJson.portless = {
      appPort: randomPort(),
      name: sanitizePortlessName(appName),
      script: "dev:app",
    };
    packageJson.scripts = {
      ...packageJson.scripts,
      dev: "portless",
      "dev:app": `next dev${bundlerFlags}`,
    };
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      ...thirdPartyDep("portless"),
    };

    configContent =
      `import packageJson from "./package.json" with { type: "json" };\n` +
      configContent.replace(
        "const developmentConfig: NextConfig = {",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: this is intended
        "const developmentConfig: NextConfig = {\nallowedDevOrigins: [`${packageJson.portless.name}.localhost`],",
      );

    configChanged = true;
  }

  if (configChanged) {
    await fs.writeFile(nextConfigFile, configContent);
  }

  /* Add Tailwind CSS dependencies. */
  if (tailwind) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      ...thirdPartyDep("@tailwindcss/postcss", "tailwind-merge", "tailwindcss"),
    };

    /* Enable the Tailwind linter domain in biome.json. */
    const biomeConfigFile = path.join(root, "biome.json" as RelativeFile);
    const biomeConfig = JSON.parse(await fs.readFile(biomeConfigFile, "utf8"));
    biomeConfig.linter ??= {};
    biomeConfig.linter.domains ??= {};
    biomeConfig.linter.domains.tailwind = "recommended";
    await fs.writeFile(
      biomeConfigFile,
      JSON.stringify(biomeConfig, null, 2) + os.EOL,
    );
  }

  /* Add dependencies and devDependencies contributed by the selected presets. */
  for (const preset of presets ?? []) {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      ...presetDeps(presetDependencies(preset)),
    };
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      ...presetDeps(presetDevDependencies(preset)),
    };
  }

  const devDeps = Object.keys(packageJson.devDependencies!).length;
  if (!devDeps) delete packageJson.devDependencies;

  // Sort dependencies and devDependencies alphabetically
  if (packageJson.dependencies) {
    packageJson.dependencies = sorted(packageJson.dependencies);
  }

  if (packageJson.devDependencies) {
    packageJson.devDependencies = sorted(packageJson.devDependencies);
  }

  if (packageManager === "pnpm") {
    // Only create pnpm-workspace.yaml for pnpm v10+.
    // In v9, having a pnpm-workspace.yaml (even with packages: []) causes
    // ERR_PNPM_ADDING_TO_ROOT errors when running `pnpm add`.
    // In v10, the packages field can be omitted entirely.
    // If we can't determine the version, assume latest (v10+) since we already
    // know pnpm is being used at this point.
    const pnpmMajorVersion = getPnpmMajorVersion();
    if (false && (pnpmMajorVersion === null || pnpmMajorVersion >= 10)) {
      const pnpmWorkspaceYaml = [
        "ignoredBuiltDependencies:",
        // Sharp has prebuilt binaries for the platforms next-swc has binaries.
        // If it needs to build binaries from source, next-swc wouldn't work either.
        // See https://sharp.pixelplumbing.com/install/#:~:text=When%20using%20pnpm%2C%20add%20sharp%20to%20ignoredBuiltDependencies%20to%20silence%20warnings
        "  - sharp",
        // Not needed for pnpm: https://github.com/unrs/unrs-resolver/issues/193#issuecomment-3295510146
        "  - unrs-resolver",
        "",
      ].join(os.EOL);
      await fs.writeFile(
        path.join(root, "pnpm-workspace.yaml" as RelativeFile),
        pnpmWorkspaceYaml,
      );
    }
  }

  if (packageManager === "bun") {
    // Equivalent to pnpm's `ignoredBuiltDependencies`, added in bun 1.3.2.
    // - https://bun.com/blog/bun-v1.3.2#faster-bun-install
    // - https://github.com/oven-sh/bun/pull/24283
    // Bun ignores `sharp` by default, but does not ignore `unrs-resolver`
    // unless configured.
    packageJson.ignoreScripts = ["sharp", "unrs-resolver"];
    // The script must be in *both* `ignoreScripts` and `trustedDependencies` to
    // suppress the warning. This could change in future versions of Bun.
    // https://vercel.slack.com/archives/C06DNAH5LSG/p1763582930218709?thread_ts=1763580178.004169&cid=C06DNAH5LSG
    packageJson.trustedDependencies = ["sharp", "unrs-resolver"];
  }

  await fs.writeFile(
    path.join(root, "package.json" as RelativeFile),
    JSON.stringify(packageJson, null, 2) + os.EOL,
  );

  if (skipInstall) return;

  console.log("\nInstalling dependencies:");
  for (const dependency in packageJson.dependencies)
    console.log(`- ${pico.cyan(dependency)}`);

  if (devDeps) {
    console.log("\nInstalling devDependencies:");
    for (const dependency in packageJson.devDependencies)
      console.log(`- ${pico.cyan(dependency)}`);
  }

  console.log();

  await install(packageManager, isOnline);
  try {
    console.log();
    await runBiome(packageManager);
    console.log();
  } catch (err) {
    console.error("Error running Biome:", err);
    // Best effort: do not fail app creation if Biome fails
  }
  try {
    console.log();
    await runTypegen(packageManager);
    console.log();
  } catch (err) {
    console.error("Error running typegen:", err);
    // Best effort: do not fail app creation if typegen fails
  }
};

export * from "./types.mts";
