import type { Config } from "jest";

const config: Config = {
  extensionsToTreatAsEsm: [".mts"],
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transform: {
    "^.+\\.m?ts$": [
      "ts-jest",
      {
        tsconfig: {
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
