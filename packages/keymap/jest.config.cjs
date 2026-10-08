module.exports = {
  coverageReporters: ["json-summary"],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/(?!dist/).*)\\.(m?[jt]s|tsx)$": "$1",
    "^\\.\\./dist/index\\.(mjs|mts)$": "<rootDir>/src/index.mts",
  },
  setupFilesAfterEnv: ["<rootDir>/../../jest-setup.cjs"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["dist"],
  transform: {
    "^.+\\.(m?ts|tsx)$": [
      "<rootDir>/../../jest-ts6-transformer.cjs",
      { useESM: true },
    ],
  },
};
