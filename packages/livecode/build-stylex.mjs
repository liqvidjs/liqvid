/** Compile StyleX in the LiveCode studio helper and extract its atomic CSS. */
import fs from "node:fs";
import path from "node:path";

import { transformAsync } from "@babel/core";
import stylexBabelPlugin from "@stylexjs/babel-plugin";

const DIST_DIR = path.resolve("dist/esm/liqvid-studio");
const OUTPUT_CSS = path.join(DIST_DIR, "stylex.css");

function collectFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(fullPath);
    }
    return entry.name.endsWith(".js") || entry.name.endsWith(".mjs")
      ? [fullPath]
      : [];
  });
}

async function main() {
  const allRules = [];
  for (const filename of collectFiles(DIST_DIR)) {
    const source = fs.readFileSync(filename, "utf8");
    if (!source.includes("stylex.create")) {
      continue;
    }
    const result = await transformAsync(source, {
      babelrc: false,
      configFile: false,
      filename,
      parserOpts: { plugins: ["jsx"] },
      plugins: [
        [
          stylexBabelPlugin,
          {
            classNamePrefix: "lvs-lc",
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
    if (!result?.code) {
      continue;
    }
    const rules = result.metadata?.stylex ?? [];
    allRules.push(...rules);
    fs.writeFileSync(filename, result.code, "utf8");
  }

  const css = stylexBabelPlugin.processStylexRules(allRules);
  fs.writeFileSync(OUTPUT_CSS, css || "/* no StyleX rules */\n", "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
