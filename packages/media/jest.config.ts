import type { Config } from "jest";

const config: Config = {
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.(m?[jt]s|tsx)$": "$1",
  },
  // Tests drive a real browser; frames take a while to decode.
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  testTimeout: 60_000,
  transform: {
    "^.+\\.(m?ts|tsx)$": [
      "<rootDir>/../../jest-ts6-transformer.cjs",
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
