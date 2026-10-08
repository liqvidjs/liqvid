export default {
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.(m?[jt]s|tsx)$": "$1",
    "^@liqvid/diff$": "<rootDir>/../diff/src/index.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/../../jest-setup.cjs"],
  testPathIgnorePatterns: ["dist"],
  transform: {
    "^.+\\.(m?ts|tsx)$": [
      "<rootDir>/../../jest-ts6-transformer.cjs",
      { useESM: true },
    ],
  },
};
