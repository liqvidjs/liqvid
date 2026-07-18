import type { Config } from "jest";

const config: Config = {
  extensionsToTreatAsEsm: [".mts", ".ts", ".tsx"],
  moduleNameMapper: {
    // Source uses explicit extension specifiers (`./utils.ts`). ts-jest's ESM
    // transform rewrites these to `.js`/`.mjs`, so strip any TS/JS extension
    // and let `moduleFileExtensions` resolve to the real source file.
    "^(\\.{1,2}/.*)\\.(m?[jt]s|tsx)$": "$1",
  },
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transform: {
    "^.+\\.(m?ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          module: "ESNext",
          moduleResolution: "bundler",
          verbatimModuleSyntax: false,
        },
        useESM: true,
      },
    ],
  },
};

export default config;
