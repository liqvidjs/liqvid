export default {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.mjs"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  testTimeout: 60_000,
};
