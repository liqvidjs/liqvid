const express = require("express");
const compression = require("compression");
const mustacheExpress = require("mustache-express");
import * as path from "path";

export async function* serve(port: Number) {
  /* express */
  const app = express();

  // standard stuff
  app.use(compression());
  // Register '.html' extension with The Mustache Express
  app.engine("html", mustacheExpress());
  app.set("view engine", "mustache");
  app.set("views", path.resolve(__dirname, "./test-apps"));

  app.get("/*.html", function (req: any, res: any) {
    res.render("index.html", { bundle: req.params[0] });
  });

  app.use("/", express.static(path.resolve(__dirname, "test-apps")));

  const server = app.listen(port);
  await new Promise((ready) => server.once("listening", ready));
  yield server;
  await new Promise((done) => server.close(done));
}

async function main() {
  const port = 9000;
  console.log("Serving on port", port);
  await serve(port).next();
}

if (!module.parent) {
  main();
}
