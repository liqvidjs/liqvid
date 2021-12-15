import express from "express";
import {promises as fsp} from "fs";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {exec} from "child_process";
import livereload from "livereload";
import compression from "compression";
import webpack from "webpack";

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";

import {scripts as defaultScripts, styles as defaultStyles} from "./default-assets";
import {template} from "./template";
import {AddressInfo} from "ws";

/**
 * Create Express app to run Liqvid development server.
 */ 
export function createServer(config: {
  /**
   * Port to run LiveReload on.
   */ 
  livereloadPort?: number;

  /**
   * Port to run the server on.
   */ 
  port?: number;

  /**
   * Static directory.
   */
   static?: string; 
}) {
  const app = express();
  const cwd = process.cwd();

  // standard stuff
  app.use(compression());

  /* body parsing? */
  app.use(cookieParser(/*process.env.SECURE_KEY*/));
  app.use(bodyParser.json({limit: "50mb"}));
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  // vars
  app.set("static", config.static);

  app.use("/", htmlMagic);
  app.use("/", express.static(config.static));
  app.listen(config.port);

  console.log(`Server listening on port ${config.port}`);

  const lr = createLivereload(config.livereloadPort);
  app.set("livereloadPort", (lr.server.address() as AddressInfo).port);
  runWebpack(config.port);

  return app;
}

const htmlMagic: express.RequestHandler = async (req, res, next) => {
  let filename;
  if (req.path.endsWith("/")) {
    filename = req.path + "index.html";
  } else if (req.path.endsWith(".html")) {
    filename = req.path;
  } else {
    return next();
  }

  // content files
  try {
    let file = await fsp.readFile(path.join(req.app.get("static"), filename), "utf8");
    const scripts = Object.assign({}, defaultScripts, {
      "livereload": {
        development() {
          const port = req.app.get("livereloadPort");
          return (
            "document.write(`<script src=\"${location.protocol}//${(location.host || 'localhost').split(':')[0]}:" + 
            port +
            "/livereload.js?snipver=1\"></` + 'script>');"
          );
        }
      }
    });
    const config = {
      mode: "development" as const,
      scripts,
      styles: defaultStyles
    };
    res.send(template(file, config));
  } catch(e) {
    next();
  }
}

/**
 * Create LiveReload server.
 */ 
function createLivereload(port: number) {
  /* livereload */
  const lrHttpServer = livereload.createServer({
    exts: ["html", "css", "png", "gif", "jpg", "svg"],
    port: 0
  });
  
  lrHttpServer.watch(process.cwd());

  return lrHttpServer;
}

/**
 * Run webpack.
 */
function runWebpack(port: number) {
  const webpackConfig = require(path.join(process.cwd(), "webpack.config.js"));
  
  const compiler = webpack(webpackConfig);

  // watch
  let firstRun = true;

  compiler.watch({}, (err, stats) => {
    console.info(stats.toString({
      colors: true
    }));

    // open in browser
    if (firstRun) {
      firstRun = false;
      exec(`xdg-open http://localhost:${port}`);
    }
  });
}
