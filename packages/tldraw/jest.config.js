export default {
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.(tsx|ts|js)$": "$1",
    "^@liqvid/diff$": "<rootDir>/../diff/src/index.ts",
  },
  preset: "ts-jest",
  testPathIgnorePatterns: ["dist"],
  transform: {},
};
