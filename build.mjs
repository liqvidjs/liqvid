/* Horrifying fixer-upper for ESM imports */
import * as fs from "fs";
import {existsSync, promises as fsp, readFileSync} from "fs";
import * as path from "path";

const DIST = path.join(process.cwd(), "dist");
const NODE_MODULES = path.join(process.cwd(), "node_modules");

build();

async function build() {
  for (const type of ["esm", "cjs"]) {
    const dir = path.join(DIST, type);
    const extn = type === "esm" ? "mjs" : "cjs";

    // rename files first
    await walkDir(dir, async (filename) => {
      if (!filename.endsWith(".js")) return;
      await renameExtension(filename, extn);
    });

    // now fix imports
    await walkDir(dir, async (filename) => {
      if (!filename.endsWith(`.${extn}`)) return;
      await fixImports(filename, type);
    });
  }
}

/**
 * Recursively walk a directory
 * @param {string} dirname Name of directory to walk
 * @param {(filename: string) => Promise<void>} callback Callback
 */
async function walkDir(dirname, callback) {
  const files = (await fsp.readdir(dirname)).map((filename) =>
    path.join(dirname, filename),
  );

  /* first rename all files */

  await Promise.all(
    files.map(async (filename) => {
      const stat = await fsp.stat(filename);
      if (stat.isDirectory()) {
        return walkDir(filename, callback);
      }
      await callback(filename);
    }),
  );
}

/**
 * Add extensions to relative imports
 * @param {string} filename File to operate on.
 * @param {"esm" | "cjs"} type Javascript module system in use.
 */
async function fixImports(filename, type = "esm") {
  let content = await fsp.readFile(filename, "utf8");
  const regex =
    type === "esm"
      ? /^((?:ex|im)port .+? from\s+)(["'])(.+?)(\2;?)$/gm
      : /(require\()(['"])(.+?)(\2\))/gm;
  content = content.replaceAll(regex, (match, head, q, name, tail) => {
    // already has extension
    if (name.match(/\.[cm]?js$/)) {
      return match;
    }

    // relative imports
    if (name.startsWith(".")) {
      // figure out which file it's referring to
      const target = findExtension(path.dirname(filename), name);
      return head + q + target + tail;
    } else {
      try {
        const json = JSON.parse(readFileSync(findPackageJson(name), "utf8"));
        if (json.exports) {
          // ARGH
          if (name === "react/jsx-runtime" && type === "esm") {
            return head + q + "react/jsx-runtime.js" + tail;
          }
        } else {
        }
      } catch (e) {
        console.error(e);
      }
    }
    return match;
  });

  await fsp.writeFile(filename, content);
}

/**
 * Find extension
 */
function findExtension(pathname, relative) {
  const filename = path.resolve(pathname, relative);
  for (const extn of ["mjs", "js", "cjs"]) {
    const full = filename + "." + extn;

    if (existsSync(full)) {
      let rewrite = path.relative(pathname, full);
      if (!rewrite.startsWith(".")) {
        rewrite = "./" + rewrite;
      }
      return rewrite;
    }
  }
  throw new Error(`Could not resolve ${filename}`);
}

/**
 * Find package.json
 * @param {string} name Name of package.
 */
function findPackageJson(name) {
  const packageName = getPackageName(name);
  let dirname = NODE_MODULES;
  while (true) {
    const filename = path.join(dirname, packageName, "package.json");
    if (fs.existsSync(filename)) return filename;
    dirname = path.normalize(path.join(dirname, ".."));
    if (dirname === "/")
      throw new Error(`Could not find package.json for ${name}`);
  }
}

/**
 * Get name of NPM package
 * @param {string} name Import string to resolve.
 */
function getPackageName(name) {
  const parts = name.split("/");
  if (name.startsWith("@")) {
    return parts.slice(0, 2).join("/");
  }
  return parts[0];
}

/**
 * Change file extension
 */
async function renameExtension(filename, extn = "mjs") {
  await fsp.rename(filename, filename.replace(/\.js$/, `.${extn}`));
}
