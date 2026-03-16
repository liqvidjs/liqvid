import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { execa } from "execa";
import Handlebars from "handlebars";
import type { Maybe } from "have-fun";

import { PROJECT_META_FILE } from "../conventions.mts";
import type { Directory } from "../types/assets.mts";
import { getBiomePath } from "../utils/fs.mts";
import { debounce } from "../utils/misc.mts";

export const ASSETS_DIRNAME = ".liqvid";

/** whether a file should be omitted from the directory listing */
function isForbidden(_filename: string, basename: string) {
  if (basename === ".DS_Store") return true;
  if (basename === "types.ts") return true;
  return false;
}

function shouldIgnore({
  basename,
  filename,
}: {
  basename: string;
  filename: string;
}) {
  if (filename.endsWith("~")) return true;
  if (basename === ".DS_Store") return true;
  return false;
}

const TARGET_DIR = path.join(process.cwd(), "app");
const TEMPLATES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "templates",
);

export async function watchAssets() {
  Handlebars.registerHelper("json", (obj) => {
    return new Handlebars.SafeString(JSON.stringify(obj, null, 2));
  });

  fs.watch(TARGET_DIR, { recursive: true }, async (_eventName, relPath) => {
    if (!relPath) return;

    const filename = path.join(TARGET_DIR, relPath);

    const dirname = path.dirname(filename);
    const basename = path.basename(filename);

    if (shouldIgnore({ basename, filename })) return;

    // assets
    const $_ = filename.match(/^.*\/\.liqvid(?=\/)/);
    if (!$_) return null;
    if (basename === "types.ts" || basename === PROJECT_META_FILE) return;

    const assetsDir = $_[0];

    const biomePath = await getBiomePath(dirname);

    debounce(() => generateProjectTypes({ assetsDir, biomePath }), assetsDir);
  });
}

/**
 * Generate the types.ts file inside the assets dir.
 */
async function generateProjectTypes({
  assetsDir,
  biomePath,
}: {
  assetsDir: string;
  biomePath: Maybe<string>;
}) {
  const directoryStructure = await listDir(assetsDir);
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
  console.debug(`compiling ${template} -> ${out}`);
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

export async function listDir(dirname: string): Promise<Directory> {
  const dir = await fsp.readdir(dirname);

  return Object.fromEntries(
    await Promise.all(
      dir.reduce(
        (acc, basename) => {
          const filename = path.join(dirname, basename);
          if (isForbidden(filename, basename)) return acc;

          const stats = fs.statSync(filename);
          if (stats.isDirectory()) {
            acc.push(listDir(filename).then((result) => [basename, result]));
          } else {
            acc.push(Promise.resolve([basename, null]));
          }
          return acc;
        },
        [] as Promise<[string, Directory | null]>[],
      ),
    ),
  );
}
