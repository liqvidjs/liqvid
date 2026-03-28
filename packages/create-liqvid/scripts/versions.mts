#!/usr/bin/env node --disable-warning=ExperimentalWarning --experimental-strip-types
/**
 * Utility script to generate a JSON file containing the versions of all
 * packages in the Liqvid monorepo.
 *
 * Usage:
 *   node --disable-warning=ExperimentalWarning --experimental-strip-types versions.ts [output-path]
 *
 * If no output path is specified, outputs to stdout.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

interface PackageJson {
  name: string;
  version: string;
}

async function getPackageVersions(): Promise<Record<string, string>> {
  const packagesDir = resolve(import.meta.dirname, "..", "..");
  const entries = await readdir(packagesDir, { withFileTypes: true });

  const versions: Record<string, string> = {};

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Skip create-liqvid itself
    if (entry.name === "create-liqvid") continue;

    const packageJsonPath = join(packagesDir, entry.name, "package.json");

    try {
      const content = await readFile(packageJsonPath, "utf-8");
      const pkg = JSON.parse(content) as PackageJson;

      if (pkg.name && pkg.version) {
        versions[entry.name] = pkg.version;
      }
    } catch {
      // Skip directories without a valid package.json
    }
  }

  // Sort by package name for consistent output
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(versions).sort()) {
    sorted[key] = versions[key];
  }

  return sorted;
}

async function main() {
  const versions = await getPackageVersions();
  const json = JSON.stringify(versions, null, 2);

  const outputPath = process.argv[2];

  if (outputPath) {
    await writeFile(outputPath, json + "\n", "utf-8");
    console.log(`Wrote versions to ${outputPath}`);
  } else {
    console.log(json);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
