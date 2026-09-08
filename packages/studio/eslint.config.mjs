// Redirect require("typescript") → ts6 for @typescript-eslint, which
// doesn't support TS 7 yet.  The hook runs before any plugin is loaded so
// the parser and ts-api-utils all see TypeScript 6.
import Module from "node:module";

const _resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  if (request === "typescript" && parent?.filename?.includes("node_modules")) {
    return _resolve.call(this, "ts6", parent, ...args);
  }
  return _resolve.call(this, request, parent, ...args);
};

const [{ default: stylexPlugin }, { default: tsParser }] = await Promise.all([
  import("@stylexjs/eslint-plugin"),
  import("@typescript-eslint/parser"),
]);

export default [
  {
    ignores: ["dist/**"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@stylexjs": stylexPlugin,
    },
    rules: {
      "@stylexjs/enforce-extension": "error",
      "@stylexjs/no-conflicting-props": "error",
      "@stylexjs/no-legacy-contextual-styles": "error",
      "@stylexjs/no-lookahead-selectors": "warn",
      "@stylexjs/no-nonstandard-styles": "error",
      "@stylexjs/no-unused": "error",
      "@stylexjs/sort-keys": "off",
      "@stylexjs/valid-shorthands": "error",
      "@stylexjs/valid-styles": "error",
    },
  },
];
