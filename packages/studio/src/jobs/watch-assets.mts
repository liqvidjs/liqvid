import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import type { Maybe } from "@liqvid/fp";
import { execa } from "execa";
import Handlebars from "handlebars";

import { PROJECT_FILE, PROJECT_META_FILE } from "../conventions.mts";
import type { Directory } from "../types/assets.mts";
import { getBiomePath } from "../utils/fs.mts";
import { debounce } from "../utils/misc.mts";

export const ASSETS_DIRNAME = ".liqvid";

/**
 * Files/patterns to exclude from the directory listing (relative to project dir).
 * Code files, config files, and generated images are excluded.
 */
const EXCLUDE_PATTERNS = [
  "project.json",
  /\.(css|js|jsx|ts|tsx)$/,
  /hls\/.*data\d+\.ts$/,
  /\.d.json.ts$/,
  /^opengraph-image\./,
  /^twitter-image\./,
];

/**
 * Special include patterns that override exclusions.
 * Files in .liqvid/*.ts should be included.
 */
function isSpecialInclude(relativePath: string): boolean {
  // Include .ts files inside .liqvid directory
  return relativePath.startsWith(".liqvid/") && relativePath.endsWith(".ts");
}

/** Check if a file should be excluded based on patterns */
function shouldExclude(relativePath: string, basename: string): boolean {
  // Always exclude these
  if (basename === ".DS_Store") return true;
  if (basename === "types.ts") return true;

  // Check special includes first (they override exclusions)
  if (isSpecialInclude(relativePath)) return false;

  // Check exclusion patterns
  for (const pattern of EXCLUDE_PATTERNS) {
    if (typeof pattern === "string") {
      if (relativePath === pattern || basename === pattern) return true;
    } else if (pattern.test(relativePath)) {
      return true;
    }
  }

  return false;
}

function shouldIgnoreEvent(basename: string, filename: string): boolean {
  if (filename.endsWith("~")) return true;
  if (basename === ".DS_Store") return true;
  if (basename === "types.ts") return true;
  if (basename === PROJECT_META_FILE) return true;
  return false;
}

const TARGET_DIR = path.join(process.cwd(), "app");
const TEMPLATES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "templates",
);

/**
 * Check if a directory is a project directory.
 * A project directory contains both project.json and page.tsx.
 */
async function isProjectDirectory(dir: string): Promise<boolean> {
  try {
    const [hasProjectJson, hasPageTsx] = await Promise.all([
      fsp
        .access(path.join(dir, PROJECT_FILE))
        .then(() => true)
        .catch(() => false),
      fsp
        .access(path.join(dir, "page.tsx"))
        .then(() => true)
        .catch(() => false),
    ]);
    return hasProjectJson && hasPageTsx;
  } catch {
    return false;
  }
}

/**
 * Find the project directory that contains the given file path.
 * Walks up the directory tree until it finds a project directory or reaches TARGET_DIR.
 */
async function findProjectDirectory(filePath: string): Promise<string | null> {
  let dir = path.dirname(filePath);

  while (dir.startsWith(TARGET_DIR) && dir !== TARGET_DIR) {
    if (await isProjectDirectory(dir)) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  // Check if TARGET_DIR itself is a project directory
  if (dir === TARGET_DIR && (await isProjectDirectory(dir))) {
    return dir;
  }

  return null;
}

export async function watchAssets() {
  Handlebars.registerHelper("json", (obj) => {
    return new Handlebars.SafeString(JSON.stringify(obj, null, 2));
  });

  fs.watch(TARGET_DIR, { recursive: true }, async (_eventName, relPath) => {
    if (!relPath) return;

    const filename = path.join(TARGET_DIR, relPath);
    const basename = path.basename(filename);

    if (shouldIgnoreEvent(basename, filename)) return;

    // Find the project directory containing this file
    const projectDir = await findProjectDirectory(filename);
    if (!projectDir) return;

    const biomePath = await getBiomePath(projectDir);

    debounce(() => generateProjectTypes({ biomePath, projectDir }), projectDir);
  });
}

/**
 * Generate the types.ts file inside the .liqvid directory.
 */
async function generateProjectTypes({
  biomePath,
  projectDir,
}: {
  biomePath: Maybe<string>;
  projectDir: string;
}) {
  const directoryStructure = await listProjectDir(projectDir);
  const assetsDir = path.join(projectDir, ASSETS_DIRNAME);

  // Ensure .liqvid directory exists
  await fsp.mkdir(assetsDir, { recursive: true });

  runTemplate({
    biomePath,
    data: {
      directoryStructure,
    },
    out: path.join(assetsDir, "types.ts"),
    template: "types.ts.hbs",
  });
}

/**
 * Generate a file from a Handlebars template, and format the result with Biome (if available).
 */
export async function runTemplate({
  biomePath,
  data,
  out,
  template,
}: {
  /** Path to the Biome executable. */
  biomePath: Maybe<string>;

  /** Data to pass to the template */
  data: unknown;

  /** Path to the output file */
  out: string;

  /** Path to the template file */
  template: string;
}) {
  const templateHbs = await fsp.readFile(
    path.join(TEMPLATES_DIR, template),
    "utf8",
  );

  try {
    const template = Handlebars.compile(templateHbs);
    const result = template(data);

    await fsp.writeFile(out, result);

    // invoke biome
    if (biomePath.isSome) {
      await execa(biomePath.unwrap(), ["check", "--fix", out]);
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * List a project directory, applying include/exclude patterns.
 * @param projectDir - The root project directory
 * @param currentDir - The current directory being listed (defaults to projectDir)
 * @param relativePath - The path relative to projectDir (defaults to "")
 */
async function listProjectDir(
  projectDir: string,
  currentDir: string = projectDir,
  relativePath: string = "",
): Promise<Directory> {
  const entries = await fsp.readdir(currentDir);

  const results = await Promise.all(
    entries.map(async (basename) => {
      const fullPath = path.join(currentDir, basename);
      const relPath = relativePath ? `${relativePath}/${basename}` : basename;

      // Check if this entry should be excluded
      if (shouldExclude(relPath, basename)) {
        return null;
      }

      const stats = await fsp.stat(fullPath);
      if (stats.isDirectory()) {
        const subDir = await listProjectDir(projectDir, fullPath, relPath);
        // Only include non-empty directories
        if (Object.keys(subDir).length > 0) {
          return [basename, subDir] as const;
        }
        return null;
      } else {
        return [basename, null] as const;
      }
    }),
  );

  return Object.fromEntries(
    results.filter(
      (entry): entry is [string, Directory | null] => entry !== null,
    ),
  );
}
