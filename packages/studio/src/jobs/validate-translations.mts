// biome-ignore-all lint/suspicious/noConsole: this is a CLI script whose purpose is to print diagnostics
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import chalk from "chalk";
import {
  type AbsoluteDir,
  type AbsoluteFile,
  RelativeDir,
  RelativeFile,
} from "effect-paths";

import { TRANSLATIONS_DIR } from "#_/conventions.mjs";
import { DEFAULT_LOCALE } from "#_/utils/i18n.mjs";

/** Directories that never contain source translations worth checking. */
const IGNORED_DIRS = new Set<string>([
  "node_modules",
  "dist",
  "out",
  ".liqvid",
  ".git",
  ".next",
]);

/** A JSON value, as parsed from a translation file. */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** A single discrepancy between a locale file and the reference `en.json`. */
type Discrepancy =
  | { kind: "missing"; keyPath: string }
  | { kind: "extra"; keyPath: string }
  | {
      kind: "type";
      keyPath: string;
      expected: string;
      actual: string;
    };

/** The result of validating one translation directory. */
interface DirReport {
  /** The `.translations` directory that was checked. */
  dir: AbsoluteDir;

  /** Whether an `en.json` reference file was present. */
  hasReference: boolean;

  /** Discrepancies per locale (excluding the reference locale). */
  locales: {
    locale: string;
    file: AbsoluteFile;
    discrepancies: Discrepancy[];
  }[];
}

/**
 * Recursively collect every `.translations` directory under `root`, skipping
 * build output and dependency directories.
 */
async function findTranslationDirs(root: AbsoluteDir): Promise<AbsoluteDir[]> {
  const found: AbsoluteDir[] = [];

  const walk = async (dir: AbsoluteDir): Promise<void> => {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      // Unreadable directory — skip it rather than aborting the whole run.
      return;
    }

    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.isDirectory()) return;
        if (IGNORED_DIRS.has(entry.name)) return;

        const qualified = path.join(dir, RelativeDir(entry.name));

        if (entry.name === TRANSLATIONS_DIR) {
          found.push(qualified);
          // No need to descend into a `.translations` directory.
          return;
        }

        await walk(qualified);
      }),
    );
  };

  await walk(root);
  found.sort();
  return found;
}

/** The name of a JSON value's type, for human-readable diagnostics. */
function typeOf(value: Json): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * Compare a locale value against the reference value, recording every
 * structural discrepancy. Only object/array *shape* is compared — leaf string
 * values are expected to differ between languages.
 */
function diffShape(
  reference: Json,
  candidate: Json,
  keyPath: string,
  out: Discrepancy[],
): void {
  const refType = typeOf(reference);
  const candType = typeOf(candidate);

  if (refType !== candType) {
    out.push({
      actual: candType,
      expected: refType,
      keyPath: keyPath || "(root)",
      kind: "type",
    });
    return;
  }

  // For plain objects, compare the set of keys and recurse.
  if (refType === "object") {
    const ref = reference as { [key: string]: Json };
    const cand = candidate as { [key: string]: Json };

    for (const key of Object.keys(ref)) {
      const childPath = keyPath ? `${keyPath}.${key}` : key;
      if (!(key in cand)) {
        out.push({ keyPath: childPath, kind: "missing" });
        continue;
      }
      diffShape(ref[key]!, cand[key]!, childPath, out);
    }

    for (const key of Object.keys(cand)) {
      if (!(key in ref)) {
        const childPath = keyPath ? `${keyPath}.${key}` : key;
        out.push({ keyPath: childPath, kind: "extra" });
      }
    }
  }

  // Arrays and leaf primitives only need their type to match, which we already
  // verified above.
}

/** Read and parse a JSON translation file, throwing a helpful error on failure. */
async function readJson(file: AbsoluteFile): Promise<Json> {
  let contents: string;
  try {
    contents = await fsp.readFile(file, "utf8");
  } catch (error) {
    throw new Error(
      `Could not read ${file}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    return JSON.parse(contents) as Json;
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${file}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Validate a single `.translations` directory: every locale file adjacent to
 * `en.json` is compared against `en.json`'s shape.
 */
async function validateDir(dir: AbsoluteDir): Promise<DirReport> {
  const entries = await fsp.readdir(dir, { withFileTypes: true });

  const localeFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name.slice(0, -".json".length));

  const referenceFile = path.join(dir, RelativeFile(`${DEFAULT_LOCALE}.json`));

  const hasReference = localeFiles.includes(DEFAULT_LOCALE);
  if (!hasReference) {
    return { dir, hasReference: false, locales: [] };
  }

  const reference = await readJson(referenceFile);

  const locales = await Promise.all(
    localeFiles
      .filter((locale) => locale !== DEFAULT_LOCALE)
      .sort()
      .map(async (locale) => {
        const file = path.join(dir, RelativeFile(`${locale}.json`));
        const candidate = await readJson(file);
        const discrepancies: Discrepancy[] = [];
        diffShape(reference, candidate, "", discrepancies);
        return { discrepancies, file, locale };
      }),
  );

  return { dir, hasReference: true, locales };
}

/** Pretty-print a discrepancy list for one locale. */
function printDiscrepancies(
  relativeDir: string,
  locale: string,
  discrepancies: Discrepancy[],
): void {
  console.warn(
    chalk.yellow(
      `⚠ ${relativeDir}/${locale}.json does not match ${DEFAULT_LOCALE}.json:`,
    ),
  );
  for (const d of discrepancies) {
    switch (d.kind) {
      case "missing":
        console.warn(chalk.red(`    missing key: ${d.keyPath}`));
        break;
      case "extra":
        console.warn(chalk.magenta(`    extra key:   ${d.keyPath}`));
        break;
      case "type":
        console.warn(
          chalk.red(
            `    type mismatch at ${d.keyPath}: expected ${d.expected}, got ${d.actual}`,
          ),
        );
        break;
    }
  }
}

/**
 * Validate all translation directories under `root`.
 *
 * @returns the number of locale files that did not match their reference
 * `en.json` (plus directories missing a reference). `0` means everything is
 * consistent.
 */
export async function validateTranslations(
  root: AbsoluteDir = process.cwd(),
): Promise<number> {
  const dirs = await findTranslationDirs(root);

  if (dirs.length === 0) {
    console.log(
      chalk.dim(`No ${TRANSLATIONS_DIR} directories found under ${root}.`),
    );
    return 0;
  }

  let problems = 0;

  for (const dir of dirs) {
    const relativeDir = path.relative(root, dir) || ".";
    const report = await validateDir(dir);

    if (!report.hasReference) {
      console.warn(
        chalk.yellow(
          `⚠ ${relativeDir} has no ${DEFAULT_LOCALE}.json reference file; skipping.`,
        ),
      );
      problems++;
      continue;
    }

    for (const { locale, discrepancies } of report.locales) {
      if (discrepancies.length === 0) continue;
      printDiscrepancies(relativeDir, locale, discrepancies);
      problems++;
    }
  }

  if (problems === 0) {
    console.log(
      chalk.green(
        `✔ All translation files match ${DEFAULT_LOCALE}.json (${dirs.length} ${dirs.length === 1 ? "directory" : "directories"} checked).`,
      ),
    );
  } else {
    console.warn(
      chalk.yellow(
        `\nFound ${problems} translation ${problems === 1 ? "issue" : "issues"}.`,
      ),
    );
  }

  return problems;
}

/** CLI entry point. Accepts an optional root directory argument. */
export async function main(
  argv: string[] = process.argv.slice(2),
): Promise<void> {
  const arg = argv.find((a) => !a.startsWith("-"));
  const root = (
    arg ? path.resolve(process.cwd(), arg) : process.cwd()
  ) as AbsoluteDir;

  const problems = await validateTranslations(root);
  process.exitCode = problems > 0 ? 1 : 0;
}

// Run when executed directly (not when imported).
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  await main();
}
