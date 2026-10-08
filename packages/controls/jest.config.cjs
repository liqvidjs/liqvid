module.exports = {
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.(m?[jt]s|tsx)$": "$1",
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
