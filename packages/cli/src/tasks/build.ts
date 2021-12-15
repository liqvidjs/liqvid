import {promises as fsp} from "fs";
import fs from "fs";
import type Yargs from "yargs";
import path from "path";

import {parseConfig, DEFAULT_CONFIG} from "./config.js";
import webpack from "webpack";
import {template, scripts, styles} from "@liqvid/server/template";

/**
 * Transcribe audio file
*/ 
export const build = (yargs: typeof Yargs) =>
  yargs
  .command("build", "Build project", (yargs) => {
    return (yargs
      .config("config", parseConfig("build"))
      .default("config", DEFAULT_CONFIG)
      .option("out", {
        alias: "o",
        coerce: path.resolve,
        desc: "Output directory",
        default: "./dist",
        normalize: true
      })
    );
  }, (args) => {
    return buildProject(args);
  })

async function buildProject(config: {
  out: string;
}) {
  console.log("!", Object.keys(scripts));
  // clean build directory
  console.log("Cleaning build directory...");
  await fsp.rm(config.out, {force: true, recursive: true});
  await fsp.mkdir(config.out, {recursive: true});

  // copy static files
  console.log("Copying files...");
  await buildStatic(config);  

  // webpack
  console.log("Creating production bundle...");
  await buildBundle(config);
}

async function buildStatic(config: {
  out: string;
}) {
  const staticDir = path.resolve(process.cwd(), "static");

  await walkDir(staticDir, async (filename) => {
    const relative = path.relative(staticDir, filename);
    const dest = path.join(config.out, relative);
    
    // apply html magic
    if (filename.endsWith(".html")) {
      const file = await fsp.readFile(filename, "utf8");
      await idemWrite(dest, template(file, {mode: "production", scripts, styles}))
    } else if (filename === "bundle.js") {

    } else {
      await fsp.mkdir(path.dirname(dest), {recursive: true});
      await fsp.copyFile(filename, dest);
    }
  });
}

async function buildBundle(config: {
  out: string;
}) {
  // configure webpack
  const webpackConfig = require(path.join(process.cwd(), "webpack.config.js"));
  webpackConfig.mode = "production";
  webpackConfig.output.path = config.out;

  const compiler = webpack(webpackConfig);

  // watch
  return new Promise<void>(resolve => {
    compiler.run((err, stats) => {
      if (err)
        console.error(err);
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
    if (old !== data)
      await fsp.writeFile(filename, data);
  } catch (e) {
    await fsp.mkdir(path.dirname(filename), {recursive: true});
    await fsp.writeFile(filename, data);
  }
}

/**
 * Recursively walk a directory.
 */ 
async function walkDir(dirname: string, callback: (filename: string) => Promise<void>) {
  const files = (await fsp.readdir(dirname)).map(_ => path.join(dirname, _));
  await Promise.all(files.map(async file => {
    const stats = await fsp.stat(file);
    if (stats.isDirectory()) {
      return walkDir(file, callback);
    } else {
      return callback(file);
    }
  }));
}