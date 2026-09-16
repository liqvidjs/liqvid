// biome-ignore-all lint/suspicious/noConsole: this is a CLI script whose purpose is to print diagnostics
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import chalk from "chalk";
import { Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/unstable/cli";
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
    throw new Error(`Could not read ${file}`, { cause: error });
  }

  try {
    return JSON.parse(contents) as Json;
  } catch (error) {
    throw new Error(`Invalid JSON in ${file}`, { cause: error });
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
// Unused-key detection (TypeScript-based)
// ---------------------------------------------------------------------------

import { type Node, Project, SyntaxKind } from "ts-morph";

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

/** Lazily created ts-morph project, shared across all `.translations` dirs. */
let _project: Project | undefined;

/**
 * Get or create the ts-morph project for the studio package.
 * Created lazily and cached for the lifetime of the process.
 */
function getProject(root: AbsoluteDir): Project {
  if (_project) return _project;

  const tsConfigFilePath = path.join(
    root,
    RelativeFile("tsconfig.json"),
  ) as string;

  _project = new Project({ tsConfigFilePath });
  return _project;
}

/**
 * Resolve the source file of a JSX component by finding its import declaration
 * in the given source file.
 */
function resolveComponentFile(
  componentName: string,
  fromFile: import("ts-morph").SourceFile,
): import("ts-morph").SourceFile | undefined {
  for (const imp of fromFile.getImportDeclarations()) {
    for (const ni of imp.getNamedImports()) {
      if (ni.getName() === componentName) {
        return imp.getModuleSpecifierSourceFile();
      }
    }
    // Default import
    const defaultImport = imp.getDefaultImport();
    if (defaultImport?.getText() === componentName) {
      return imp.getModuleSpecifierSourceFile();
    }
  }
  return undefined;
}

/**
 * Given a variable/parameter declaration node, follow all references to it and
 * collect the translation key-paths that are accessed.
 *
 * @param declNode - The declaration node (VariableDeclaration, BindingElement,
 *   or Parameter) whose references to follow.
 * @param prefix - A key-path prefix to prepend to all discovered keys (used
 *   when the variable holds a sub-object, e.g. `useTranslations<T>().renders`).
 * @param allLeafKeys - The full set of leaf keys from the JSON, used for
 *   conservative marking when dynamic access is detected.
 * @param referenced - Accumulator set for all referenced key-paths.
 * @param visited - Set of already-visited file paths to prevent cycles.
 */
function followReferences(
  declNode: Node,
  prefix: string,
  allLeafKeys: Set<string>,
  referenced: Set<string>,
  visited: Set<string>,
): void {
  let refs: Node[];
  try {
    refs = declNode.findReferencesAsNodes();
  } catch {
    return;
  }

  for (const ref of refs) {
    const parent = ref.getParent();
    if (!parent) continue;

    const parentKind = parent.getKind();

    // --- Property access: t.foo or t.foo.bar ---
    if (parentKind === SyntaxKind.PropertyAccessExpression) {
      // Walk up the full chain: t.foo.bar.baz
      let topAccess = parent;
      while (
        topAccess.getParent()?.getKind() === SyntaxKind.PropertyAccessExpression
      ) {
        const grandparent = topAccess.getParent()!;
        // Only continue if we're the expression (left side) of the parent
        // PropertyAccessExpression, not the name (right side).
        const parentPAE = grandparent.asKindOrThrow(
          SyntaxKind.PropertyAccessExpression,
        );
        if (parentPAE.getExpression() === topAccess) {
          topAccess = grandparent;
        } else {
          break;
        }
      }

      // Extract the chain of property names from the bottom up
      const chain: string[] = [];
      let cur = topAccess;
      while (cur.getKind() === SyntaxKind.PropertyAccessExpression) {
        const pae = cur.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
        chain.unshift(pae.getName());
        cur = pae.getExpression();
      }

      if (chain.length > 0) {
        const fullPath = prefix
          ? `${prefix}.${chain.join(".")}`
          : chain.join(".");
        referenced.add(fullPath);

        // Also mark all ancestor paths as referenced.
        const parts = fullPath.split(".");
        for (let i = 1; i < parts.length; i++) {
          referenced.add(parts.slice(0, i).join("."));
        }
      }
      continue;
    }

    // --- Element access with string literal: t["foo"] ---
    if (parentKind === SyntaxKind.ElementAccessExpression) {
      const eae = parent.asKindOrThrow(SyntaxKind.ElementAccessExpression);
      const arg = eae.getArgumentExpression();
      if (arg?.getKind() === SyntaxKind.StringLiteral) {
        const key = arg
          .asKindOrThrow(SyntaxKind.StringLiteral)
          .getLiteralValue();
        const fullPath = prefix ? `${prefix}.${key}` : key;
        referenced.add(fullPath);
      } else if (arg) {
        // Dynamic bracket access — conservatively mark all leaf keys under
        // the current prefix as referenced.
        for (const key of allLeafKeys) {
          if (prefix ? key.startsWith(`${prefix}.`) : !key.includes(".")) {
            referenced.add(key);
          }
        }
        // Also mark all top-level keys without prefix for unprefixed access.
        if (!prefix) {
          for (const key of allLeafKeys) {
            if (!key.includes(".")) referenced.add(key);
          }
        }
      }
      continue;
    }

    // --- JSX attribute: t={t} or similar prop passing ---
    if (parentKind === SyntaxKind.JsxExpression) {
      const jsxExpr = parent;
      const attr = jsxExpr.getParent();
      if (attr?.getKind() === SyntaxKind.JsxAttribute) {
        // Find the JSX element this attribute belongs to.
        const attrList = attr.getParent();
        const element = attrList?.getParent();
        const tagNameNode =
          element?.getKind() === SyntaxKind.JsxOpeningElement
            ? element
                .asKindOrThrow(SyntaxKind.JsxOpeningElement)
                .getTagNameNode()
            : element?.getKind() === SyntaxKind.JsxSelfClosingElement
              ? element
                  .asKindOrThrow(SyntaxKind.JsxSelfClosingElement)
                  .getTagNameNode()
              : null;

        if (tagNameNode) {
          const componentName = tagNameNode.getText();
          const sourceFile = ref.getSourceFile();
          const targetFile = resolveComponentFile(componentName, sourceFile);

          if (targetFile) {
            const targetPath = targetFile.getFilePath();
            const visitKey = `${targetPath}:${prefix}`;
            if (!visited.has(visitKey)) {
              visited.add(visitKey);
              // Find the prop parameter in the target component.
              const propName = attr
                .asKindOrThrow(SyntaxKind.JsxAttribute)
                .getNameNode()
                .getText();
              followPropsInFile(
                targetFile,
                propName,
                prefix,
                allLeafKeys,
                referenced,
                visited,
              );
            }
          }
        }
      }
      continue;
    }

    // --- Spread: {...t} ---
    if (
      parentKind === SyntaxKind.SpreadAssignment ||
      parentKind === SyntaxKind.SpreadElement ||
      parentKind === SyntaxKind.JsxSpreadAttribute
    ) {
      // All keys are reachable.
      for (const key of allLeafKeys) {
        if (!prefix || key.startsWith(`${prefix}.`)) {
          referenced.add(key);
        }
      }
      continue;
    }

    // --- Shorthand property in object spread into JSX ---
    // Pattern: <Comp {...{ t, otherProp }} />
    // `t` is a ShorthandPropertyAssignment inside an ObjectLiteralExpression
    // inside a JsxSpreadAttribute.
    if (parentKind === SyntaxKind.ShorthandPropertyAssignment) {
      const objLiteral = parent.getParent();
      const spreadAttr = objLiteral?.getParent();
      if (spreadAttr?.getKind() === SyntaxKind.JsxSpreadAttribute) {
        const attrList = spreadAttr.getParent();
        const element = attrList?.getParent();
        const tagNameNode =
          element?.getKind() === SyntaxKind.JsxOpeningElement
            ? element
                .asKindOrThrow(SyntaxKind.JsxOpeningElement)
                .getTagNameNode()
            : element?.getKind() === SyntaxKind.JsxSelfClosingElement
              ? element
                  .asKindOrThrow(SyntaxKind.JsxSelfClosingElement)
                  .getTagNameNode()
              : null;

        if (tagNameNode) {
          const componentName = tagNameNode.getText();
          const sourceFile = ref.getSourceFile();
          const targetFile = resolveComponentFile(componentName, sourceFile);

          if (targetFile) {
            const targetPath = targetFile.getFilePath();
            const propName = parent
              .asKindOrThrow(SyntaxKind.ShorthandPropertyAssignment)
              .getName();
            const visitKey = `${targetPath}:${propName}:${prefix}`;
            if (!visited.has(visitKey)) {
              visited.add(visitKey);
              followPropsInFile(
                targetFile,
                propName,
                prefix,
                allLeafKeys,
                referenced,
                visited,
              );
            }
          }
        }
      }
      continue;
    }

    // --- Variable assignment: const $t = interpolated(t) ---
    // When t is passed as a function argument and the result is assigned to
    // a variable, follow the variable's references too.
    if (parentKind === SyntaxKind.CallExpression) {
      const call = parent.asKindOrThrow(SyntaxKind.CallExpression);
      const grandparent = call.getParent();
      if (grandparent?.getKind() === SyntaxKind.VariableDeclaration) {
        const varDecl = grandparent.asKindOrThrow(
          SyntaxKind.VariableDeclaration,
        );
        const visitKey = `${ref.getSourceFile().getFilePath()}:var:${varDecl.getName()}:${prefix}`;
        if (!visited.has(visitKey)) {
          visited.add(visitKey);
          followReferences(varDecl, prefix, allLeafKeys, referenced, visited);
        }
      }
      // Also handle: const $t = useMemo(() => interpolated(t), [t])
      // where the call is inside an arrow function that's an argument to
      // another call.
      if (
        grandparent?.getKind() === SyntaxKind.ArrowFunction ||
        grandparent?.getKind() === SyntaxKind.ReturnStatement
      ) {
        // Walk up to find the enclosing variable declaration
        let ancestor = grandparent.getParent();
        // biome-ignore lint/suspicious/noAssignInExpressions: walking up the AST
        while (ancestor && (ancestor = ancestor.getParent())) {
          if (ancestor.getKind() === SyntaxKind.VariableDeclaration) {
            const varDecl = ancestor.asKindOrThrow(
              SyntaxKind.VariableDeclaration,
            );
            const visitKey = `${ref.getSourceFile().getFilePath()}:var:${varDecl.getName()}:${prefix}`;
            if (!visited.has(visitKey)) {
              visited.add(visitKey);
              followReferences(
                varDecl,
                prefix,
                allLeafKeys,
                referenced,
                visited,
              );
            }
            break;
          }
        }
      }
    }

    // --- Function argument (non-call): passed to a function parameter ---
    // This is handled above via CallExpression for the common case.
    // For other cases (e.g. `someArray.map(t => ...)`) we don't need to
    // follow further since the callback parameter shadows the outer `t`.
  }
}

/**
 * Find parameters/bindings named `propName` in component functions within a
 * file and follow their references to collect accessed keys.
 */
function followPropsInFile(
  file: import("ts-morph").SourceFile,
  propName: string,
  prefix: string,
  allLeafKeys: Set<string>,
  referenced: Set<string>,
  visited: Set<string>,
): void {
  // Look for destructured props: function Foo({ t, ... }: ...)
  for (const be of file.getDescendantsOfKind(SyntaxKind.BindingElement)) {
    if (be.getName() === propName) {
      followReferences(be, prefix, allLeafKeys, referenced, visited);
    }
  }

  // Also look for parameter access: function Foo(props: ...) { props.t }
  for (const param of file.getDescendantsOfKind(SyntaxKind.Parameter)) {
    const nameNode = param.getNameNode();
    if (nameNode.getKind() !== SyntaxKind.Identifier) continue;
    // Check if this parameter's property `propName` is accessed
    let paramRefs: Node[];
    try {
      paramRefs = param.findReferencesAsNodes();
    } catch {
      continue;
    }
    for (const ref of paramRefs) {
      const parent = ref.getParent();
      if (
        parent?.getKind() === SyntaxKind.PropertyAccessExpression &&
        parent.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName() ===
          propName
      ) {
        // `props.t` — follow this expression's references as if it were `t`
        const propAccess = parent.asKindOrThrow(
          SyntaxKind.PropertyAccessExpression,
        );
        // Check what happens with props.t — it might be used in further
        // property accesses or passed to children. We handle this by checking
        // the parent of the property access.
        const propParent = propAccess.getParent();
        if (propParent?.getKind() === SyntaxKind.PropertyAccessExpression) {
          // props.t.someKey — extract the chain
          let topAccess = propParent;
          while (
            topAccess.getParent()?.getKind() ===
            SyntaxKind.PropertyAccessExpression
          ) {
            const gp = topAccess.getParent()!;
            const gpPAE = gp.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
            if (gpPAE.getExpression() === topAccess) {
              topAccess = gp;
            } else {
              break;
            }
          }
          const chain: string[] = [];
          let cur = topAccess;
          while (cur.getKind() === SyntaxKind.PropertyAccessExpression) {
            const pae = cur.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
            chain.unshift(pae.getName());
            cur = pae.getExpression();
          }
          // Remove the first element (which is the propName itself, e.g. "t")
          if (chain.length > 1) {
            chain.shift();
            const fullPath = prefix
              ? `${prefix}.${chain.join(".")}`
              : chain.join(".");
            referenced.add(fullPath);
            const parts = fullPath.split(".");
            for (let i = 1; i < parts.length; i++) {
              referenced.add(parts.slice(0, i).join("."));
            }
          }
        }
      }
    }
  }
}

/**
 * For a single `.translations` directory, find unused keys in `en.json` by
 * using TypeScript AST analysis to follow translation key references through
 * imports, prop passing, and variable assignments.
 *
 * Uses ts-morph to:
 * 1. Find all source files that import the `en.json` (via module resolution)
 * 2. Locate variables that hold the translations object
 * 3. Follow all references through property accesses, JSX prop passing, and
 *    derived variables (e.g. `interpolated(t)`)
 * 4. Report keys that are never accessed
 *
 * @returns the set of unused leaf key-paths, or `null` if no consumers were
 * found (meaning we can't determine usage).
 */
function findUnusedKeys(
  translationsDir: AbsoluteDir,
  referenceJson: Json,
  root: AbsoluteDir,
): string[] | null {
  const project = getProject(root);

  const enJsonPath = path.join(
    translationsDir,
    RelativeFile(`${DEFAULT_LOCALE}.json`),
  ) as string;

  // Find all source files that import this en.json.
  const consumers: import("ts-morph").SourceFile[] = [];
  for (const sf of project.getSourceFiles()) {
    if ((sf.getFilePath() as string).includes("node_modules")) continue;
    for (const imp of sf.getImportDeclarations()) {
      const moduleSpec = imp.getModuleSpecifierValue();
      if (!moduleSpec.endsWith("en.json")) continue;
      const resolved = imp.getModuleSpecifierSourceFile();
      if (resolved && (resolved.getFilePath() as string) === enJsonPath) {
        consumers.push(sf);
        break;
      }
    }
  }

  if (consumers.length === 0) return null;

  const allLeafKeys = new Set<string>();
  collectLeafKeyPaths(referenceJson, "", allLeafKeys);

  const allReferenced = new Set<string>();
  const visited = new Set<string>();

  for (const consumer of consumers) {
    const filePath = consumer.getFilePath() as string;

    // --- Handle value imports (useAsyncTranslations pattern) ---
    // import Translations from "./.translations/en.json";
    // const t = useAsyncTranslations(Translations, ...)
    for (const imp of consumer.getImportDeclarations()) {
      if (!imp.getModuleSpecifierValue().endsWith("en.json")) continue;
      const resolved = imp.getModuleSpecifierSourceFile();
      if (!resolved || (resolved.getFilePath() as string) !== enJsonPath) {
        continue;
      }

      // Check if this is a value import (not type-only).
      if (!imp.isTypeOnly()) {
        const defaultImport = imp.getDefaultImport();
        if (defaultImport) {
          // The import binding is used as a value — follow its references.
          // This handles `useAsyncTranslations(Translations, ...)`.
          const bindingRefs = defaultImport.findReferencesAsNodes();
          for (const ref of bindingRefs) {
            const parent = ref.getParent();
            if (parent?.getKind() === SyntaxKind.CallExpression) {
              // Value passed to a function — find the resulting variable
              const call = parent.asKindOrThrow(SyntaxKind.CallExpression);
              const gp = call.getParent();
              if (gp?.getKind() === SyntaxKind.VariableDeclaration) {
                const varDecl = gp.asKindOrThrow(
                  SyntaxKind.VariableDeclaration,
                );
                const visitKey = `${filePath}:var:${varDecl.getName()}:`;
                if (!visited.has(visitKey)) {
                  visited.add(visitKey);
                  followReferences(
                    varDecl,
                    "",
                    allLeafKeys,
                    allReferenced,
                    visited,
                  );
                }
              }
            } else if (parent?.getKind() === SyntaxKind.JsxExpression) {
              // Passed directly as a JSX prop — mark all keys as used
              // (we can't trace further).
              for (const key of allLeafKeys) allReferenced.add(key);
            } else if (
              parent?.getKind() === SyntaxKind.SpreadAssignment ||
              parent?.getKind() === SyntaxKind.SpreadElement
            ) {
              for (const key of allLeafKeys) allReferenced.add(key);
            }
          }
        }
      }
    }

    // --- Handle getTranslations / useTranslations / useAsyncTranslations ---
    // Find variable declarations whose initializer calls these functions.
    for (const varDecl of consumer.getDescendantsOfKind(
      SyntaxKind.VariableDeclaration,
    )) {
      const init = varDecl.getInitializer();
      if (!init) continue;
      const initText = init.getText();

      const isTranslationCall =
        initText.includes("getTranslations") ||
        initText.includes("useTranslations") ||
        initText.includes("useAsyncTranslations");

      if (!isTranslationCall) continue;

      // Determine if the call extracts a sub-object:
      // e.g. `useTranslations<T>().renders.rename`
      // Walk inward from the outermost PropertyAccessExpression, collecting
      // property names until we hit the call. For `x().renders.rename`,
      // the walk goes: rename → renders → x() (stop). Result: "renders.rename".
      let prefix = "";
      {
        const chain: string[] = [];
        let cur: Node = init;
        while (cur.getKind() === SyntaxKind.PropertyAccessExpression) {
          const pae = cur.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
          chain.push(pae.getName());
          cur = pae.getExpression();
        }
        // `chain` is [outermost, ..., innermost], reverse to get key order.
        chain.reverse();
        if (chain.length > 0) {
          prefix = chain.join(".");
        }
      }

      const visitKey = `${filePath}:var:${varDecl.getName()}:${prefix}`;
      if (!visited.has(visitKey)) {
        visited.add(visitKey);
        followReferences(varDecl, prefix, allLeafKeys, allReferenced, visited);
      }
    }

    // --- Handle function parameter `t` (e.g. component props) ---
    // function Foo({ t }: { t: T }) { ... }
    // This is the entry point when the file is a direct consumer that
    // receives translations as a prop from a server component.
    for (const be of consumer.getDescendantsOfKind(SyntaxKind.BindingElement)) {
      if (be.getName() !== "t") continue;

      // Check if this binding element is in a function parameter
      // (component prop destructuring).
      const param = be.getFirstAncestorByKind(SyntaxKind.Parameter);
      if (!param) continue;

      const visitKey = `${filePath}:param:t:`;
      if (!visited.has(visitKey)) {
        visited.add(visitKey);
        followReferences(be, "", allLeafKeys, allReferenced, visited);
      }
    }
  }

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
// Fixing unused keys
// ---------------------------------------------------------------------------

/**
 * Delete a dot-separated key-path from a nested JSON object, cleaning up empty
 * parent objects left behind. Mutates `obj` in place.
 */
function deleteKeyPath(obj: { [key: string]: Json }, keyPath: string): void {
  const parts = keyPath.split(".");
  const stack: { parent: { [key: string]: Json }; key: string }[] = [];
  let current: Json = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (
      typeof current !== "object" ||
      current === null ||
      Array.isArray(current)
    ) {
      return;
    }
    const key = parts[i]!;
    stack.push({ key, parent: current });
    current = current[key]!;
  }

  if (
    typeof current !== "object" ||
    current === null ||
    Array.isArray(current)
  ) {
    return;
  }

  const leafKey = parts[parts.length - 1]!;
  delete current[leafKey];

  // Walk back up, removing empty parent objects.
  for (let i = stack.length - 1; i >= 0; i--) {
    const { parent, key } = stack[i]!;
    const child = parent[key];
    if (
      typeof child === "object" &&
      child !== null &&
      !Array.isArray(child) &&
      Object.keys(child).length === 0
    ) {
      delete parent[key];
    } else {
      break;
    }
  }
}

/**
 * Remove unused keys from all JSON files in a `.translations` directory.
 *
 * Unused keys are detected from `en.json`, but when deleting they are removed
 * from **every** sibling locale file in the same directory.
 */
async function removeUnusedKeysFromDir(
  dir: AbsoluteDir,
  unusedKeys: string[],
): Promise<string[]> {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);

  const fixedFiles: string[] = [];

  for (const fileName of jsonFiles) {
    const file = path.join(dir, RelativeFile(fileName));
    let json: Json;
    try {
      json = await readJson(file);
    } catch {
      continue;
    }

    if (typeof json !== "object" || json === null || Array.isArray(json)) {
      continue;
    }

    let modified = false;
    for (const keyPath of unusedKeys) {
      // Check if the key exists in this locale file before deleting.
      const parts = keyPath.split(".");
      let current: Json = json;
      let exists = true;
      for (const part of parts) {
        if (
          typeof current !== "object" ||
          current === null ||
          Array.isArray(current) ||
          !(part in current)
        ) {
          exists = false;
          break;
        }
        current = current[part]!;
      }

      if (exists) {
        deleteKeyPath(json as { [key: string]: Json }, keyPath);
        modified = true;
      }
    }

    if (modified) {
      await fsp.writeFile(file, `${JSON.stringify(json, null, 2)}\n`, "utf8");
      fixedFiles.push(fileName);
    }
  }

  return fixedFiles;
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
 * @param options.fix - When `true` (requires `checkUnused`), automatically
 *   delete unused keys from all sibling translation JSON files.
 *
 * @returns the number of locale files that did not match their reference
 * `en.json` (plus directories missing a reference). `0` means everything is
 * consistent.
 */
export async function validateTranslations(
  root: AbsoluteDir = process.cwd() as AbsoluteDir,
  options: { glob?: string; checkUnused?: boolean; fix?: boolean } = {},
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
      const unused = findUnusedKeys(dir, referenceJson, root);

      if (unused === null) {
        console.warn(
          chalk.dim(
            `  ${relativeDir}: no source files import ${DEFAULT_LOCALE}.json; cannot check for unused keys.`,
          ),
        );
      } else if (unused.length > 0) {
        if (options.fix) {
          const fixedFiles = await removeUnusedKeysFromDir(dir, unused);
          console.log(
            chalk.green(
              `✓ ${relativeDir}: removed ${unused.length} unused ${unused.length === 1 ? "key" : "keys"} from ${fixedFiles.length} ${fixedFiles.length === 1 ? "file" : "files"} (${fixedFiles.join(", ")}).`,
            ),
          );
          for (const key of unused) {
            console.log(chalk.green(`    deleted key: ${key}`));
          }
        } else {
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

// ---------------------------------------------------------------------------
// CLI definition
// ---------------------------------------------------------------------------

const command = Command.make(
  "validate-translations",
  {
    fix: Flag.Boolean("fix").pipe(
      Flag.withDescription(
        "Automatically delete unused keys from all sibling translation JSON files. Must be used with --unused.",
      ),
      Flag.withDefault(false),
    ),
    glob: Flag.String("glob").pipe(
      Flag.withDescription(
        "Glob pattern to limit which .translations directories are checked (matched against relative path from root).",
      ),
      Flag.withMetavar("PATTERN"),
      Flag.optional,
    ),
    root: Argument.Directory("root").pipe(
      Argument.withDescription(
        "Root directory to search for .translations directories.",
      ),
      Argument.withDefault("."),
    ),
    unused: Flag.Boolean("unused").pipe(
      Flag.withDescription(
        "Check for unused translation keys by scanning source files that import each en.json.",
      ),
      Flag.withDefault(false),
    ),
  },
  (config) =>
    Effect.gen(function* () {
      if (config.fix && !config.unused) {
        console.error(
          chalk.red("Error: --fix can only be used together with --unused."),
        );
        process.exitCode = 1;
        return;
      }
      const root = path.resolve(process.cwd(), config.root) as AbsoluteDir;
      const problems = yield* Effect.promise(() =>
        validateTranslations(root, {
          checkUnused: config.unused,
          fix: config.fix,
          glob: Option.getOrUndefined(config.glob),
        }),
      );
      process.exitCode = problems > 0 ? 1 : 0;
    }),
).pipe(
  Command.withDescription(
    "Validate translation files: check that every locale matches the en.json reference shape, and optionally detect unused translation keys.",
  ),
);

/** CLI entry point. */
export const main = Command.run(command, { version: "0.1.0" }).pipe(
  Effect.provide(NodeServices.layer),
);

// Run when executed directly (not when imported).
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  NodeRuntime.runMain(main);
}
