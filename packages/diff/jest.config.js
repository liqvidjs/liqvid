export default {
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.(ts|js)$": "$1",
  },
  preset: "ts-jest",
  testPathIgnorePatterns: ["dist"],
  transform: {},
};
