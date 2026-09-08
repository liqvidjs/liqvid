/**
 * Post-build step: compile StyleX in dist/esm/.
 *
 * Runs the @stylexjs/babel-plugin over every JS/MJS file produced by tsc,
 * replaces stylex.create() calls with pre-compiled {$$css:true,...} objects,
 * and extracts all generated atomic CSS into dist/esm/stylex.css.
 *
 * After this step, consumers do NOT need the StyleX compiler — they only
 * need the tiny stylex.props() runtime (shipped as a dependency).
 */
/** biome-ignore-all lint/suspicious/noConsole: internal helper */

import fs from "node:fs";
import path from "node:path";

import { transformAsync } from "@babel/core";
import stylexBabelPlugin from "@stylexjs/babel-plugin";

const SRC_DIR = path.resolve("src");
const DIST_DIR = path.resolve("dist/esm");
const OUTPUT_CSS = path.join(DIST_DIR, "stylex.css");

/** Recursively collect all .js and .mjs files under a directory. */
function collectFiles(dir, ext = [".js", ".mjs"]) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, ext));
    } else if (ext.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error("dist/esm/ does not exist — run `pnpm build:js` first.");
    process.exit(1);
  }

  const files = collectFiles(DIST_DIR);
  /** @type {Array<[string, {ltr: string, rtl?: string | null}, number]>} */
  const allRules = [];
  let transformed = 0;

  await Promise.all(
    files.map(async (filePath) => {
      const source = fs.readFileSync(filePath, "utf-8");

      // Quick check: skip files that don't have uncompiled StyleX calls.
      // After compilation, these calls are replaced with static objects,
      // so this check ensures we don't re-process already-compiled files.
      if (
        !source.includes("stylex.create") &&
        !source.includes("stylex.defineVars") &&
        !source.includes("stylex.createTheme") &&
        !source.includes("stylex.keyframes")
      ) {
        return;
      }

      const result = await transformAsync(source, {
        babelrc: false,
        configFile: false,
        filename: filePath,
        parserOpts: {
          plugins: ["jsx"],
        },
        plugins: [
          [
            stylexBabelPlugin,
            {
              // Resolve Node.js subpath imports (#_/*) to dist/esm/*
              aliases: {
                "#_/*": ["/ROOT/*"],
              },
              dev: false,
              runtimeInjection: false,
              // Use the dist directory as root so class names are stable
              unstable_moduleResolution: {
                rootDir: DIST_DIR,
                type: "commonJS",
              },
            },
          ],
        ],
        // Preserve ESM syntax — don't downlevel imports/exports
        sourceType: "module",
      });

      if (!result?.code) return;

      const rules = result.metadata?.stylex;
      if (rules && rules.length > 0) {
        allRules.push(...rules);
      }

      // Overwrite the file with the compiled output
      fs.writeFileSync(filePath, result.code, "utf-8");
      transformed++;
    }),
  );

  // defineVars source files (.stylex.ts) may have been compiled in a previous
  // run, so their dist/ counterparts no longer contain the defineVars() call
  // and were skipped above. Re-compile the original .ts sources to extract
  // the :root CSS variable definitions that would otherwise be lost on
  // incremental builds.
  const varFiles = collectFiles(SRC_DIR, [".stylex.ts"]);
  await Promise.all(
    varFiles.map(async (srcPath) => {
      const source = fs.readFileSync(srcPath, "utf-8");
      if (!source.includes("stylex.defineVars")) return;

      // Map src/ path to its dist/ equivalent to use as the filename so
      // that the plugin resolves the same hashed variable names.
      const relPath = path.relative(SRC_DIR, srcPath);
      const distPath = path.join(DIST_DIR, relPath.replace(/\.tsx?$/, ".js"));

      const result = await transformAsync(source, {
        babelrc: false,
        configFile: false,
        filename: distPath,
        parserOpts: {
          plugins: ["jsx", "typescript"],
        },
        plugins: [
          [
            stylexBabelPlugin,
            {
              aliases: { "#_/*": ["/ROOT/*"] },
              dev: false,
              runtimeInjection: false,
              unstable_moduleResolution: {
                rootDir: DIST_DIR,
                type: "commonJS",
              },
            },
          ],
        ],
        sourceType: "module",
      });

      const rules = result?.metadata?.stylex;
      if (rules && rules.length > 0) {
        // Deduplicate: only add rules whose key isn't already present
        // (in case the dist file was freshly compiled and already contributed).
        const existingKeys = new Set(allRules.map((r) => r[0]));
        for (const rule of rules) {
          if (!existingKeys.has(rule[0])) {
            allRules.push(rule);
          }
        }
      }
    }),
  );

  // Bundle all collected rules into a single CSS file
  const css = stylexBabelPlugin.processStylexRules(allRules);

  if (css.length > 0) {
    fs.writeFileSync(OUTPUT_CSS, css, "utf-8");
    console.log(
      `[stylex] Compiled ${transformed} file(s), extracted ${allRules.length} rule(s) → ${path.relative(".", OUTPUT_CSS)}`,
    );
  } else {
    // Write an empty file so imports don't break
    fs.writeFileSync(OUTPUT_CSS, "/* no stylex rules */\n", "utf-8");
    console.log("[stylex] No StyleX rules found.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
