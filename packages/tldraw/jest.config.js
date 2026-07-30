export default {
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^@liqvid/diff$": "<rootDir>/../diff/src/index.ts",
    "^(\\.{1,2}/.*)\\.(tsx|ts|js)$": "$1",
  },
  preset: "ts-jest",
  testPathIgnorePatterns: ["dist"],
  transform: {},
};
