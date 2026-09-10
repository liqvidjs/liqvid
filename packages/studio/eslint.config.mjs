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
      "@stylexjs/valid-styles": [
        "error",
        {
          propLimits: {
            "background*Color": {
              limit: null,
              reason: "use a colors.* token from `#_/design/tokens.stylex.js`",
            },
            "border*Color": {
              limit: null,
              reason: "use a colors.* token from `#_/design/tokens.stylex.js`",
            },
            "border*Radius": {
              limit: null,
              reason: "use a radii.* token from `#_/design/tokens.stylex.js`",
            },
            "border*Width": {
              limit: null,
              reason: "use a dims.* token from `#_/design/tokens.stylex.js`",
            },
            boxShadow: {
              limit: null,
              reason: "use a shadows.* token from `#_/design/tokens.stylex.js`",
            },
            color: {
              limit: null,
              reason: "use a colors.* token from `#_/design/tokens.stylex.js`",
            },
            columnGap: {
              limit: null,
              reason: "use a spacing.* token from `#_/design/tokens.stylex.js`",
            },
            fontFamily: {
              limit: ["inherit"],
              reason:
                "use a typeface.* token from `#_/design/tokens.stylex.js`",
            },
            fontSize: {
              limit: null,
              reason: "use a text.* token from `#_/design/tokens.stylex.js`",
            },
            gap: {
              limit: null,
              reason: "use a spacing.* token from `#_/design/tokens.stylex.js`",
            },
            "margin*": {
              limit: null,
              reason: "use a spacing.* token from `#_/design/tokens.stylex.js`",
            },
            "outline*Color": {
              limit: null,
              reason: "use a colors.* token from `#_/design/tokens.stylex.js`",
            },
            "outline*Width": {
              limit: null,
              reason: "use a dims.* token from `#_/design/tokens.stylex.js`",
            },
            "padding*": {
              limit: null,
              reason: "use a spacing.* token from `#_/design/tokens.stylex.js`",
            },
            rowGap: {
              limit: null,
              reason: "use a spacing.* token from `#_/design/tokens.stylex.js`",
            },
          },
        },
      ],
    },
  },
];
