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

import { TRANSLATIONS_DIR } from "./src/conventions.mts";

const DEFAULT_LOCALE = "en";

const EXCLUDE = new Set(["es", "de", "zh"]);

/** Directories that never contain source translations worth checking. */
const IGNORED_DIRS = new Set<string>([
  "node_modules",
  "dist",
  "out",
  ".liqvid",
  ".git",
  ".next",
]);

/**
 * Keys used as interpolation-template infrastructure in translation JSON.
 * When an object has `_` (template) + `$` (variables), or `__template`, the
 * parent key is the meaningful translation key — not these children.
 */
const INTERPOLATION_KEYS = new Set(["_", "$", "__template"]);

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
    .map((entry) => entry.name.slice(0, -".json".length))
    .filter((locale) => !EXCLUDE.has(locale));

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
      `! ${relativeDir}/${locale}.json does not match ${DEFAULT_LOCALE}.json:`,
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

// ---------------------------------------------------------------------------
// Unused-key detection
// ---------------------------------------------------------------------------

/** Source extensions to search when looking for `en.json` consumers. */
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".mtsx"]);

/**
 * Collect all leaf key-paths from a JSON value.
 *
 * Interpolation-template objects (containing `_`/`$` or `__template`) are
 * treated as leaves — the parent key is the meaningful translation key.
 */
function collectLeafKeyPaths(
  value: Json,
  prefix: string,
  out: Set<string>,
): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    if (prefix) out.add(prefix);
    return;
  }

  const keys = Object.keys(value);

  // Detect interpolation-template objects: they have `_`+`$` or `__template`.
  const isInterpolation = keys.some((k) => INTERPOLATION_KEYS.has(k));
  if (isInterpolation) {
    // The parent key is the meaningful one; don't recurse into template guts.
    if (prefix) out.add(prefix);
    return;
  }

  for (const key of keys) {
    const childPath = prefix ? `${prefix}.${key}` : key;
    collectLeafKeyPaths(value[key]!, childPath, out);
  }
}

/**
 * Collect all intermediate (non-leaf) key-paths from a JSON value.
 * These represent sub-objects that code may access as a whole
 * (e.g. `useTranslations<T>().renders`).
 */
function collectBranchKeyPaths(
  value: Json,
  prefix: string,
  out: Set<string>,
): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return;
  }

  const keys = Object.keys(value);
  if (keys.some((k) => INTERPOLATION_KEYS.has(k))) return;

  if (prefix) out.add(prefix);

  for (const key of keys) {
    const childPath = prefix ? `${prefix}.${key}` : key;
    collectBranchKeyPaths(value[key]!, childPath, out);
  }
}

/**
 * Recursively find all source files (`.ts`, `.tsx`, `.mts`) under a directory,
 * skipping ignored directories.
 */
async function findSourceFiles(root: AbsoluteDir): Promise<AbsoluteFile[]> {
  const found: AbsoluteFile[] = [];

  const walk = async (dir: AbsoluteDir): Promise<void> => {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    await Promise.all(
      entries.map(async (entry) => {
        if (entry.isDirectory()) {
          if (IGNORED_DIRS.has(entry.name)) return;
          if (entry.name === TRANSLATIONS_DIR) return;
          await walk(path.join(dir, RelativeDir(entry.name)));
          return;
        }
        if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
          found.push(path.join(dir, RelativeFile(entry.name)));
        }
      }),
    );
  };

  await walk(root);
  return found;
}

/**
 * Find source files that import the given `en.json` file by resolving their
 * relative import specifiers.
 *
 * Matches patterns like:
 *   import type TranslationsJson from "./.translations/en.json";
 *   import TranslationsJson from "../.translations/en.json" with { type: "json" };
 *   import TranslationsJson from "#_/.translations/en.json";
 */
async function findConsumers(
  enJsonFile: AbsoluteFile,
  root: AbsoluteDir,
): Promise<AbsoluteFile[]> {
  const sourceFiles = await findSourceFiles(root);
  const consumers: AbsoluteFile[] = [];

  // Regex matches any import (type or value) from a path ending in en.json.
  const importRe =
    /import\s+(?:type\s+)?\w+\s+from\s+["']([^"']*\/en\.json)["']/g;

  await Promise.all(
    sourceFiles.map(async (file) => {
      let contents: string;
      try {
        contents = await fsp.readFile(file, "utf8");
      } catch {
        return;
      }

      for (const match of contents.matchAll(importRe)) {
        const specifier = match[1]!;

        // Skip subpath imports (e.g. `#_/.translations/en.json`) — these
        // resolve relative to the package root, not the importing file.
        // We resolve them against root + the portion after `#_/`.
        let resolved: string;
        if (specifier.startsWith("#")) {
          // Strip the `#_/` prefix (or similar) and resolve from root.
          const stripped = specifier.replace(/^#[^/]*\//, "");
          resolved = path.resolve(root as string, stripped);
        } else {
          resolved = path.resolve(path.dirname(file), specifier);
        }

        if (resolved === (enJsonFile as string)) {
          consumers.push(file);
          break; // No need to check further imports in the same file.
        }
      }
    }),
  );

  return consumers;
}

/**
 * Extract all translation key-paths referenced in a source file.
 *
 * Handles these patterns:
 * 1. `t.foo.bar` — dot-access chains on `t`
 * 2. `t["foo"]` / `t['foo']` — bracket access
 * 3. `useTranslations<T>().renders` — sub-object extraction, then dot access
 * 4. Template-literal bracket access: `t[\`shortcut_${key}\`]` — treated as
 *    a wildcard (marks all top-level keys matching the prefix as used)
 *
 * The function is intentionally generous: it scans for property-access patterns
 * on any identifier named `t`, `c`, or `common` (the conventional names),
 * plus patterns where `useTranslations<T>()` or `getTranslations<T>(...)` is
 * immediately followed by a dot-access chain.
 */
function extractReferencedKeys(
  source: string,
  allLeafKeys: Set<string>,
  allBranchKeys: Set<string>,
): Set<string> {
  const referenced = new Set<string>();

  // --- Step 1: Find sub-object extractions ---
  // Patterns like `const t = useTranslations<T>().renders.rename;`
  // or `const t = (await getTranslations<T>(...)).foo;`
  // These establish that `t` actually refers to a sub-tree.
  //
  // We build a map: variable-scope-free prefix → the prefix from the JSON.
  // For simplicity we track these as a list of prefixes that `t` might resolve
  // to, then prepend them when we see `t.key`.
  const prefixes: string[] = [""];

  // Match `useTranslations<T>().a.b.c` or `getTranslations<T>(...)).a.b`
  const subObjectRe =
    /(?:useTranslations|getTranslations)\s*<[^>]*>\s*\([^)]*\)\s*\)?\s*((?:\.\w+)+)/g;
  for (const match of source.matchAll(subObjectRe)) {
    const chain = match[1]!;
    const prefix = chain.split(".").filter(Boolean).join(".");
    if (prefix) {
      prefixes.push(prefix);
    }
  }

  // --- Step 2: Extract property-access chains on `t` / `c` / `common` ---
  // We look for identifiers followed by `.prop` or `["prop"]` chains.
  // The identifiers we care about are `t`, `c`, and `common`.
  //
  // This regex captures the start of a chain: an identifier followed by a
  // dot or bracket. We then iteratively extend the chain.
  const chainStartRe =
    /\b(t|c|common)\s*(?:\.\s*(\w+)|\[\s*["'](\w+)["']\s*\])/g;

  for (const match of source.matchAll(chainStartRe)) {
    const firstKey = match[2] ?? match[3]!;
    let chain = firstKey;

    // Continue extending the chain from the end of this match.
    let pos = match.index + match[0].length;
    while (pos < source.length) {
      // Skip whitespace.
      while (pos < source.length && /\s/.test(source[pos]!)) pos++;

      if (source[pos] === ".") {
        pos++;
        while (pos < source.length && /\s/.test(source[pos]!)) pos++;
        const propMatch = source.slice(pos).match(/^(\w+)/);
        if (propMatch) {
          chain += `.${propMatch[1]}`;
          pos += propMatch[1]!.length;
        } else {
          break;
        }
      } else if (source[pos] === "[") {
        const bracketMatch = source
          .slice(pos)
          .match(/^\[\s*["'](\w+)["']\s*\]/);
        if (bracketMatch) {
          chain += `.${bracketMatch[1]}`;
          pos += bracketMatch[0].length;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // For each possible prefix, mark the full key path as referenced.
    for (const prefix of prefixes) {
      const fullPath = prefix ? `${prefix}.${chain}` : chain;
      referenced.add(fullPath);

      // Also mark all ancestor paths as referenced (if code accesses
      // `t.renders`, that implicitly uses the `renders` branch).
      const parts = fullPath.split(".");
      for (let i = 1; i < parts.length; i++) {
        referenced.add(parts.slice(0, i).join("."));
      }
    }
  }

  // --- Step 3: Handle dynamic bracket access ---
  // Patterns like `t[code]` or `t[\`shortcut_${key}\`]` — we cannot know the
  // exact key at static analysis time, so we conservatively mark all leaf keys
  // as referenced if we detect dynamic bracket access on `t`.
  const dynamicBracketRe = /\b(t|c|common)\s*\[\s*(?!["'])/g;
  if (dynamicBracketRe.test(source)) {
    // Mark every top-level leaf key as referenced (conservative).
    for (const key of allLeafKeys) {
      if (!key.includes(".")) {
        referenced.add(key);
      }
    }
    // Also check for prefixed dynamic access: `t.tabs[dynamicKey]`
    const prefixedDynamicRe = /\b(?:t|c|common)((?:\.\w+)+)\s*\[\s*(?!["'])/g;
    for (const match of source.matchAll(prefixedDynamicRe)) {
      const prefix = match[1]!.split(".").filter(Boolean).join(".");
      // Mark all leaves under this prefix as referenced.
      for (const key of allLeafKeys) {
        if (key.startsWith(`${prefix}.`)) {
          referenced.add(key);
        }
      }
    }
  }

  // --- Step 4: Handle spread / whole-object passing ---
  // If `t` is passed as a prop (`t={t}`) or spread (`{...t}`), or assigned
  // wholesale, all keys are implicitly reachable.
  const wholeTRe = /(?:\bt={t}\b|\{\.\.\.t\}|\bt\s+as\b)/;
  if (wholeTRe.test(source)) {
    for (const key of allLeafKeys) referenced.add(key);
  }

  // --- Step 5: Handle wholesale import pass-through ---
  // If the imported translations object (regardless of name) is passed as an
  // argument to a function (e.g. `useAsyncTranslations(Translations, ...)`)
  // or used as a default value / spread, we can't trace further — mark all
  // keys as used.
  //
  // Detect: find the import binding name, then check if it appears in a
  // function call, spread, or JSX prop context (not just as a type).
  const importBindingRe =
    /import\s+(?!type\s)(\w+)\s+from\s+["'][^"']*\/en\.json["']/g;
  for (const match of source.matchAll(importBindingRe)) {
    const binding = match[1]!;
    // If the binding is used as a value (not just in `typeof` / type
    // positions), conservatively mark all keys as used.
    const usageRe = new RegExp(
      `(?:` +
        // Function argument: `fn(Binding` or `fn(x, Binding`
        `\\(\\s*(?:\\w+\\s*,\\s*)*${binding}\\b` +
        `|` +
        // Spread: `{...Binding}` or `[...Binding]`
        `\\.\\.\\.${binding}\\b` +
        `|` +
        // JSX prop: `prop={Binding}`
        `=\\{\\s*${binding}\\s*\\}` +
        `|` +
        // Assignment: `= Binding;` or `= Binding as`
        `=\\s*${binding}\\s*(?:as\\b|;)` +
        `)`,
    );
    if (usageRe.test(source)) {
      for (const key of allLeafKeys) referenced.add(key);
    }
  }

  return referenced;
}

/**
 * For a single `.translations` directory, find unused keys in `en.json` by
 * checking which keys are referenced in the source files that import it.
 *
 * @returns the set of unused leaf key-paths, or `null` if no consumers were
 * found (meaning we can't determine usage).
 */
async function findUnusedKeys(
  translationsDir: AbsoluteDir,
  referenceJson: Json,
  root: AbsoluteDir,
): Promise<string[] | null> {
  const enJsonFile = path.join(
    translationsDir,
    RelativeFile(`${DEFAULT_LOCALE}.json`),
  );

  const consumers = await findConsumers(enJsonFile, root);
  if (consumers.length === 0) return null;

  const allLeafKeys = new Set<string>();
  collectLeafKeyPaths(referenceJson, "", allLeafKeys);

  const allBranchKeys = new Set<string>();
  collectBranchKeyPaths(referenceJson, "", allBranchKeys);

  const allReferenced = new Set<string>();

  await Promise.all(
    consumers.map(async (file) => {
      let source: string;
      try {
        source = await fsp.readFile(file, "utf8");
      } catch {
        return;
      }

      for (const key of extractReferencedKeys(
        source,
        allLeafKeys,
        allBranchKeys,
      )) {
        allReferenced.add(key);
      }
    }),
  );

  // A leaf key is unused if neither it nor any of its ancestors appear in the
  // referenced set.
  const unused: string[] = [];
  for (const key of allLeafKeys) {
    if (allReferenced.has(key)) continue;

    // Check if any ancestor branch is referenced (which would mean the entire
    // sub-tree is passed somewhere we can't statically trace).
    const parts = key.split(".");
    let ancestorReferenced = false;
    for (let i = 1; i < parts.length; i++) {
      if (allReferenced.has(parts.slice(0, i).join("."))) {
        ancestorReferenced = true;
        break;
      }
    }
    if (!ancestorReferenced) {
      unused.push(key);
    }
  }

  unused.sort();
  return unused;
}

// ---------------------------------------------------------------------------
// Glob filtering
// ---------------------------------------------------------------------------

/**
 * Test whether a path matches a glob pattern.
 *
 * Uses a minimal implementation that supports `*`, `**`, and `?` wildcards
 * so we don't need an external dependency. The match is performed against
 * the relative path from the root.
 */
function matchGlob(pattern: string, filePath: string): boolean {
  // Convert glob pattern to a regular expression.
  let regexStr = "^";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i]!;
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        // `**` matches any number of path segments.
        if (pattern[i + 2] === "/") {
          regexStr += "(?:.+/)?";
          i += 3;
        } else {
          regexStr += ".*";
          i += 2;
        }
      } else {
        // `*` matches anything except `/`.
        regexStr += "[^/]*";
        i++;
      }
    } else if (ch === "?") {
      regexStr += "[^/]";
      i++;
      // biome-ignore lint/suspicious/noTemplateCurlyInString: not an interpolation
    } else if (".+^${}()|[]\\".includes(ch)) {
      regexStr += `\\${ch}`;
      i++;
    } else {
      regexStr += ch;
      i++;
    }
  }
  regexStr += "$";

  return new RegExp(regexStr).test(filePath);
}

// ---------------------------------------------------------------------------
// Main validation
// ---------------------------------------------------------------------------

/**
 * Validate all translation directories under `root`.
 *
 * @param root - The root directory to search for `.translations` directories.
 * @param options.glob - Optional glob pattern to limit which `.translations`
 *   directories are checked. Matched against the path relative to `root`.
 * @param options.checkUnused - Whether to check for unused translation keys.
 *
 * @returns the number of locale files that did not match their reference
 * `en.json` (plus directories missing a reference). `0` means everything is
 * consistent.
 */
export async function validateTranslations(
  root: AbsoluteDir = process.cwd() as AbsoluteDir,
  options: { glob?: string; checkUnused?: boolean } = {},
): Promise<number> {
  let dirs = await findTranslationDirs(root);

  if (options.glob) {
    const pattern = options.glob;
    dirs = dirs.filter((dir) => {
      const relative = path.relative(root, dir) || ".";
      return matchGlob(pattern, relative);
    });
  }

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
          `! ${relativeDir} has no ${DEFAULT_LOCALE}.json reference file; skipping.`,
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

    // Check for unused keys when requested.
    if (options.checkUnused) {
      const referenceFile = path.join(
        dir,
        RelativeFile(`${DEFAULT_LOCALE}.json`),
      );
      const referenceJson = await readJson(referenceFile);
      const unused = await findUnusedKeys(dir, referenceJson, root);

      if (unused === null) {
        console.warn(
          chalk.dim(
            `  ${relativeDir}: no source files import ${DEFAULT_LOCALE}.json; cannot check for unused keys.`,
          ),
        );
      } else if (unused.length > 0) {
        console.warn(
          chalk.cyan(
            `! ${relativeDir}/${DEFAULT_LOCALE}.json has ${unused.length} potentially unused ${unused.length === 1 ? "key" : "keys"}:`,
          ),
        );
        for (const key of unused) {
          console.warn(chalk.cyan(`    unused key: ${key}`));
        }
        problems++;
      }
    }
  }

  if (problems === 0) {
    const extra = options.checkUnused ? " and no unused keys detected" : "";
    console.log(
      chalk.green(
        `√ All translation files match ${DEFAULT_LOCALE}.json (${dirs.length} ${dirs.length === 1 ? "directory" : "directories"} checked)${extra}.`,
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
  const positional = argv.find((a) => !a.startsWith("-"));
  const root = (
    positional ? path.resolve(process.cwd(), positional) : process.cwd()
  ) as AbsoluteDir;

  const globIdx = argv.indexOf("--glob");
  const globArg =
    argv.find((a) => a.startsWith("--glob="))?.slice("--glob=".length) ??
    (globIdx !== -1 ? argv[globIdx + 1] : undefined);

  const checkUnused =
    argv.includes("--unused") || argv.includes("--check-unused");

  const problems = await validateTranslations(root, {
    checkUnused,
    glob: globArg,
  });
  process.exitCode = problems > 0 ? 1 : 0;
}

// Run when executed directly (not when imported).
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  await main();
}
