import {
  ScriptData,
  scripts as defaultScripts,
  StyleData,
  styles as defaultStyles,
  transform,
} from "@liqvid/magic";
import {promises as fsp} from "fs";
import path from "path";
import webpack from "webpack";
import type Yargs from "yargs";
import {DEFAULT_CONFIG, parseConfig} from "./config.mjs";
// @ts-expect-error TypeScript complains about this not being a module
import loadSync from "./load-sync.cjs";

/**
 * Build project
 */
export const build = (yargs: typeof Yargs) =>
  yargs.command(
    "build",
    "Build project",
    (yargs) => {
      return yargs
        .config("config", parseConfig("build"))
        .default("config", DEFAULT_CONFIG)
        .option("clean", {
          alias: "C",
          default: false,
          desc: "Delete old dist directory before starting",
          type: "boolean",
        })
        .option("out", {
          alias: "o",
          coerce: path.resolve,
          desc: "Output directory",
          default: "./dist",
          normalize: true,
        })
        .option("static", {
          alias: "s",
          coerce: path.resolve,
          desc: "Static directory",
          default: "./static",
        })
        .option("scripts", {
          coerce: coerceScripts,
          desc: "Script aliases",
          default: {},
        })
        .option("styles", {
          desc: "Style aliases",
          default: {},
        });
    },
    (args) => {
      return buildProject(args);
    },
  );

export async function buildProject(config: {
  /** Clean build directory */
  clean: boolean;

  /** Output directory */
  out: string;

  /** Static directory */
  static: string;

  scripts: Record<string, ScriptData>;

  styles: Record<string, StyleData>;
}) {
  // clean build directory
  if (config.clean) {
    console.log("Cleaning build directory...");
    await fsp.rm(config.out, {force: true, recursive: true});
  }

  // ensure build directory exists
  await fsp.mkdir(config.out, {recursive: true});

  // copy static files
  console.log("Copying files...");
  await buildStatic(config);

  // webpack
  console.log("Creating production bundle...");
  await buildBundle(config);
}

/**
 * Copy over static files.
 */
async function buildStatic(config: {
  out: string;
  static: string;
  scripts: Record<string, ScriptData>;
  styles: Record<string, StyleData>;
}) {
  const staticDir = path.resolve(process.cwd(), config.static);
  const scripts = Object.assign({}, defaultScripts, config.scripts);
  const styles = Object.assign({}, defaultStyles, config.styles);

  await walkDir(staticDir, async (filename) => {
    const relative = path.relative(staticDir, filename);
    const dest = path.join(config.out, relative);

    // apply html magic
    if (filename.endsWith(".html")) {
      const file = await fsp.readFile(filename, "utf8");
      await idemWrite(
        dest,
        transform(file, {mode: "production", scripts, styles}),
      );
    } else if (relative === "bundle.js") {
    } else {
      await fsp.mkdir(path.dirname(dest), {recursive: true});
      await fsp.copyFile(filename, dest);
    }
  });
}

/**
 * Compile bundle in production mode.
 */
async function buildBundle(config: {
  out: string;
}) {
  // configure webpack
  process.env.NODE_ENV = "production";
  const webpackConfig = loadSync(path.join(process.cwd(), "webpack.config.js"));
  webpackConfig.mode = "production";
  webpackConfig.output.path = config.out;

  const compiler = webpack(webpackConfig);

  // watch
  return new Promise<void>((resolve) => {
    compiler.run((err, stats) => {
      if (err) console.error(err);
      else {
        console.info(stats.toString({color: true}));
      }
      compiler.close((err, stats) => {
        resolve();
      });
    });
  });
}

/**
 * Write a file idempotently.
 */
async function idemWrite(filename: string, data: string) {
  try {
    const old = await fsp.readFile(filename, "utf8");
    if (old !== data) await fsp.writeFile(filename, data);
  } catch (e) {
    await fsp.mkdir(path.dirname(filename), {recursive: true});
    await fsp.writeFile(filename, data);
  }
}

/**
 * Recursively walk a directory.
 */
async function walkDir(
  dirname: string,
  callback: (filename: string) => Promise<void>,
) {
  const files = (await fsp.readdir(dirname)).map((_) => path.join(dirname, _));
  await Promise.all(
    files.map(async (file) => {
      const stats = await fsp.stat(file);
      if (stats.isDirectory()) {
        return walkDir(file, callback);
      } else {
        return callback(file);
      }
    }),
  );
}

/**
 * Fix files.
 */
function coerceScripts(
  json: Record<
    string,
    | {
        crossorigin?: boolean | string;
        development?: string;
        production?: string;
      }
    | string
  >,
) {
  for (const key in json) {
    const record = json[key];
    if (typeof record === "object") {
      if (
        typeof record.crossorigin === "string" &&
        ["true", "false"].includes(record.crossorigin)
      ) {
        record.crossorigin = record.crossorigin === "true";
      }
    }
  }
  return json;
}
