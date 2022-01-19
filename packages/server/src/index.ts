import {ScriptData, scripts as defaultScripts, StyleData, styles as defaultStyles, transform} from "@liqvid/magic";
import bodyParser from "body-parser";
import {exec} from "child_process";
import compression from "compression";
import cookieParser from "cookie-parser";
import express from "express";
import {promises as fsp} from "fs";
import livereload from "livereload";
import * as path from "path";
import webpack from "webpack";
import type {AddressInfo} from "ws";

/**
 * Create Express app to run Liqvid development server.
 */ 
export function createServer(config: {
  /**
   * Build directory.
   */ 
  build?: string;

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

   scripts?: Record<string, ScriptData>;

   styles?: Record<string, StyleData>;
}) {
  const app = express();

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

  // livereload
  const lr = createLivereload(config.livereloadPort, config.static);
  const lrPort = (lr.server.address() as AddressInfo).port;
  app.set("livereloadPort", lrPort);

  // magic
  const scripts = Object.assign({}, defaultScripts, config.scripts ?? {}, {
    "livereload": {
      development() {
        return (
          "document.write(`<script src=\"${location.protocol}//${(location.host || 'localhost').split(':')[0]}:" + 
          lrPort +
          "/livereload.js?snipver=1\"></` + 'script>');"
        );
      }
    }
  });
  const styles = Object.assign({}, defaultStyles, config.styles ?? {});

  // routes
  app.use("/", htmlMagic(scripts, styles));
  app.use("/", express.static(config.static));
  app.use("/dist", express.static(config.build));

  // support dynamic port via config.port = 0
  const server = app.listen(config.port);
  server.on("listening", () => {
    const {port} = server.address() as AddressInfo;
    app.set("port", port);

    console.log(`View your video at http://localhost:${port}`);

    runWebpack(port);
  });
  server.on("error", err => {
    console.error(err);
    process.exit(1);
  });

  return app;
}

function htmlMagic(scripts: Record<string, ScriptData>, styles: Record<string, StyleData>): express.RequestHandler {
  return async (req, res, next) => {
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
      const file = await fsp.readFile(path.join(req.app.get("static"), filename), "utf8");
      res.send(transform(file, {mode: "development", scripts, styles}));
    } catch(e) {
      next();
    }
  }
}

/**
 * Run LiveReload server
 * @param port Port to run LiveReload on
 */
function createLivereload(port: number, staticDir: string) {
  /* livereload */
  const lrHttpServer = livereload.createServer({
    exts: ["html", "css", "png", "gif", "jpg", "svg"],
    port
  });
  
  lrHttpServer.watch(staticDir);

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
