import {promises as fsp} from "fs";
import fs from "fs";
import type Yargs from "yargs";
import path from "path";

import {createServer} from "@liqvid/server";

import {parseConfig, DEFAULT_CONFIG} from "./config.js";

/**
 * Transcribe audio file
*/ 
export const serve = (yargs: typeof Yargs) =>
  yargs
  .command("serve", "Run preview server", (yargs) => {
    return (yargs
      .config("config", parseConfig("serve"))
      .default("config", DEFAULT_CONFIG)
      .option("livereload-port", {
        alias: "lr",
        desc: "Port to run LiveReload on",
        default: 0
      })
      .option("port", {
        alias: "p",
        desc: "Port to run on",
        default: 3000
      })
      .option("static", {
        alias: "s",
        coerce: path.resolve,
        desc: "Static directory",
        default: "./static"
      })
    );
  }, (args) => {
    return new Promise((resolve, reject) => {
      const app = createServer(args);
    })
  })
