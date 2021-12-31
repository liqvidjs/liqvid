import {createServer} from "@liqvid/server";
import path from "path";
import type Yargs from "yargs";
import {DEFAULT_CONFIG, parseConfig} from "./config.js";

/**
* Run preview server
*/ 
export const serve = (yargs: typeof Yargs) =>
yargs
.command("serve", "Run preview server", (yargs) => {
  return (yargs
    .config("config", parseConfig("serve"))
    .default("config", DEFAULT_CONFIG)
    .option("build", {
      alias: "b",
      coerce: path.resolve,
      desc: "Build directory",
      default: "./dist"
    })
    .option("livereload-port", {
      alias: "L",
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
    .option("scripts", {
      desc: "Script aliases",
      default: {}
    })
    .option("styles", {
      desc: "Style aliases",
      default: {}
    })
    );
  }, (args) => {
    return new Promise((resolve, reject) => {
      const app = createServer(args);
    })
  })
  