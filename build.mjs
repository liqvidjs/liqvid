/* Horrifying fixer-upper for ESM imports */
import * as fs from "fs";
import {existsSync, promises as fsp, readFileSync} from "fs";
import * as path from "path";

const ESM = path.join(process.cwd(), "dist", "esm");
const NODE_MODULES = path.join(process.cwd(), "node_modules");

build();

async function build() {
  // rename files first
  await walkDir(ESM, async filename => {
    if (!filename.endsWith(".js"))
      return;
    await renameExtension(filename);
  });
  // now fix imports
  await walkDir(ESM, async filename => {
    if (!filename.endsWith(".mjs"))
      return;
    await fixImports(filename);
  });
}

/**
 * Recursively walk a directory
 * @param {string} dirname Name of directory to walk
 * @param {(filename: string) => Promise<void>} callback Callback
 */
async function walkDir(dirname, callback) {
  const files = (await fsp.readdir(dirname)).map(filename => path.join(dirname, filename));

  /* first rename all files */

  await Promise.all(files.map(async filename => {
    const stat = await fsp.stat(filename);
    if (stat.isDirectory()) {
      return walkDir(filename, callback);
    }
    await callback(filename);
  }));
}

/** Add extensions to relative imports */
async function fixImports(filename) {
  let content = await fsp.readFile(filename, "utf8");
  content = content.replaceAll(/^((?:ex|im)port .+? from\s+)(["'])(.+?)(\2;?)$/gm, (match, head, q, name, tail) => {
    // already has extension
    if (name.match(/\.[cm]?js$/)) {
      return match;
    }

    // relative imports
    if (name.startsWith(".")) {
      // figure out which file it's referring to
      const target = findExtension(path.dirname(filename), name);
      return (head + q + target + tail);
    } else {
      try {
        const json = JSON.parse(readFileSync(findPackageJson(name), "utf8"));
        if (json.exports) {
          // ARGH
          if (name === "react/jsx-runtime") {
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

/** Find extension */
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

/** Find package.json */
function findPackageJson(name) {
  const packageName = getPackageName(name);
  let dirname = NODE_MODULES;
  while (true) {
    const filename = path.join(dirname, packageName, "package.json");
    if (fs.existsSync(filename))
      return filename;
    dirname = path.normalize(path.join(dirname, ".."));
    if (dirname === "/")
      throw new Error(`Could not find package.json for ${name}`);
  }
}

/** Get name of NPM package */
function getPackageName(name) {
  const parts = name.split("/");
  if (name.startsWith("@")) {
    return parts.slice(0, 2).join("/");
  }
  return parts[0];
}

/** Change file extension */
async function renameExtension(filename, extn = "mjs") {
  await fsp.rename(filename, filename.replace(/\.js$/, `.${extn}`));
}
