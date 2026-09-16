import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { Effect, Option } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import {
  type AbsoluteDir,
  type AbsoluteFile,
  RelativeDir,
  RelativeFile,
} from "effect-paths";
import Handlebars from "handlebars";

import { UP } from "../utils/effect.mts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATES_DIR = path.join(
  __dirname,
  UP,
  UP,
  UP,
  RelativeDir("templates"),
);

const LIQVID_STUDIO_SERVER_PLUGIN = "./liqvid-studio-server-plugin";

const DYNAMIC_IMPORTS_TEMPLATE = RelativeFile("dynamic-imports.ts.hbs");

const OUTPUT_FILENAME = RelativeFile(".dynamic-imports.ts");

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  exports?: Record<string, unknown>;
  name?: string;
}

/**
 * Check if a package has a liqvid-studio-server-plugin export.
 */
async function hasServerPlugin(
  packageName: string,
  nodeModulesDir: AbsoluteDir,
): Promise<boolean> {
  // Handle scoped packages
  const packageDir = path.join(
    nodeModulesDir,
    ...(packageName.split("/") as RelativeDir[]),
  );
  const packageJsonPath = path.join(packageDir, RelativeFile("package.json"));

  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson: PackageJson = JSON.parse(
      await fsp.readFile(packageJsonPath, "utf-8"),
    );

    if (!packageJson.exports) {
      return false;
    }

    return LIQVID_STUDIO_SERVER_PLUGIN in packageJson.exports;
  } catch {
    return false;
  }
}

/**
 * Find all dependencies with liqvid-studio-server-plugin exports.
 */
async function findPlugins(cwd: AbsoluteDir): Promise<string[]> {
  const packageJsonPath = path.join(cwd, RelativeFile("package.json"));

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`No package.json found in ${cwd}`);
  }

  const packageJson: PackageJson = JSON.parse(
    await fsp.readFile(packageJsonPath, "utf-8"),
  );

  const allDependencies = [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ];

  const nodeModulesDir = path.join(cwd, RelativeDir("node_modules"));

  const plugins: string[] = [];

  await Promise.all(
    allDependencies.map(async (dep) => {
      if (await hasServerPlugin(dep, nodeModulesDir)) {
        plugins.push(dep);
      }
    }),
  );

  return plugins.sort();
}

/**
 * Generate the dynamic-imports file content.
 */
async function generateContent(plugins: string[]): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, DYNAMIC_IMPORTS_TEMPLATE);
  const templateSource = await fsp.readFile(templatePath, "utf8");
  const template = Handlebars.compile(templateSource);
  return template({ plugins });
}

/**
 * Generate dynamic-imports command
 */
export const generateImports = Command.make(
  "generate-imports",
  {
    cwd: Flag.Directory("cwd").pipe(
      Flag.withAlias("C"),
      Flag.withDescription("Working directory"),
      Flag.withDefault(process.cwd()),
    ),
    output: Flag.String("output").pipe(
      Flag.withAlias("o"),
      Flag.withDescription("Output file path"),
      Flag.optional,
    ),
  },
  ({ cwd, output }) =>
    Effect.gen(function* () {
      const cwdDir = path.resolve(cwd) as AbsoluteDir;
      const outputPath =
        (Option.getOrUndefined(output) as AbsoluteFile | undefined) ??
        path.join(cwdDir, OUTPUT_FILENAME);

      console.log("Scanning dependencies for server plugins...");

      const plugins = yield* Effect.promise(() => findPlugins(cwdDir));

      if (plugins.length === 0) {
        console.log("No server plugins found in dependencies.");
      } else {
        console.log(`Found ${plugins.length} server plugin(s):`);
        for (const plugin of plugins) {
          console.log(`  - ${plugin}`);
        }
      }

      const content = yield* Effect.promise(() => generateContent(plugins));
      yield* Effect.promise(() => fsp.writeFile(outputPath, content));

      console.log(`Generated ${outputPath}`);
    }),
).pipe(
  Command.withDescription("Generate dynamic-imports file for server plugins"),
);
