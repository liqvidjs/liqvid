import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type AbsoluteDir,
  type AbsoluteFile,
  RelativeDir,
  RelativeFile,
} from "effect-paths";
import Handlebars from "handlebars";
import type { CommandModule } from "yargs";

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
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  exports?: Record<string, unknown>;
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

  for (const dep of allDependencies) {
    if (await hasServerPlugin(dep, nodeModulesDir)) {
      plugins.push(dep);
    }
  }

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
export const generateImports: CommandModule = {
  builder: (yargs) =>
    yargs
      .option("cwd", {
        alias: "C",
        coerce: path.resolve,
        default: process.cwd(),
        desc: "Working directory",
      })
      .option("output", {
        alias: "o",
        desc: "Output file path",
        type: "string",
      }),
  command: "generate-imports",
  describe: "Generate dynamic-imports file for server plugins",
  handler: async (args) => {
    const cwd = args.cwd as AbsoluteDir;
    const outputPath =
      (args.output as AbsoluteFile) ?? path.join(cwd, OUTPUT_FILENAME);

    console.log("Scanning dependencies for server plugins...");

    const plugins = await findPlugins(cwd);

    if (plugins.length === 0) {
      console.log("No server plugins found in dependencies.");
    } else {
      console.log(`Found ${plugins.length} server plugin(s):`);
      for (const plugin of plugins) {
        console.log(`  - ${plugin}`);
      }
    }

    const content = await generateContent(plugins);
    await fsp.writeFile(outputPath, content);

    console.log(`Generated ${outputPath}`);
  },
};
