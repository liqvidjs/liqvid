#!/usr/bin/env node --disable-warning=ExperimentalWarning --experimental-strip-types
import * as fsp from "node:fs/promises";
import * as path from "node:path";

/**
 * Utility script to generate a JSON file containing the versions of all
 * packages in the Liqvid monorepo.
 *
 * Usage:
 *   node --disable-warning=ExperimentalWarning --experimental-strip-types versions.ts [output-path]
 *
 * If no output path is specified, outputs to stdout.
 */
import type { AbsoluteDir, AbsoluteFile, RelativeFile } from "effect-paths";

interface PackageJson {
  name: string;
  version: string;
}

async function getPackageVersions(): Promise<Record<string, string>> {
  const packagesDir = path.resolve(
    import.meta.dirname,
    "..",
    "..",
  ) as AbsoluteDir;
  const entries = await fsp.readdir(packagesDir, { withFileTypes: true });

  const versions: Record<string, string> = {};

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Skip create-liqvid itself
    if (entry.name === "create-liqvid") continue;

    const packageJsonPath = path.join(
      packagesDir,
      entry.name,
      "package.json" as RelativeFile,
    );

    try {
      const content = await fsp.readFile(packageJsonPath, "utf8");
      const pkg = JSON.parse(content) as PackageJson;

      if (pkg.name && pkg.version) {
        versions[entry.name] = `^${pkg.version}`;
      }
    } catch {
      // Skip directories without a valid package.json
    }
  }

  // Sort by package name for consistent output
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(versions).sort()) {
    sorted[key] = versions[key]!;
  }

  return sorted;
}

async function main() {
  const versions = await getPackageVersions();
  const json = JSON.stringify(versions, null, 2);

  const outputPath = process.argv[2] as AbsoluteFile | undefined;

  if (outputPath) {
    await fsp.writeFile(outputPath, json + "\n", "utf8");
    console.log(`Wrote versions to ${outputPath}`);
  } else {
    console.log(json);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
