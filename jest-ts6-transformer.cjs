const Module = require("node:module");
const path = require("node:path");

// ts-jest also imports `typescript` directly, so setting its compiler option
// alone still lets that import pick up TypeScript 7.
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  if (request === "typescript" && parent?.filename?.includes("node_modules")) {
    return resolve.call(this, "ts6", parent, ...args);
  }
  return resolve.call(this, request, parent, ...args);
};

const { createRequire } = Module;
const packageRequire = createRequire(path.join(process.cwd(), "package.json"));
const { default: tsJest } = packageRequire("ts-jest");

exports.createTransformer = (options = {}) =>
  tsJest.createTransformer({ ...options, compiler: "ts6" });
