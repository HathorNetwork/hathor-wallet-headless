module.exports = {
  clearMocks: true,
  coverageDirectory: "coverage",
  testEnvironment: "node",
  collectCoverage: true,
  collectCoverageFrom: ["<rootDir>/src/**/*.js"],
  testMatch: ["<rootDir>/__tests__/**/*.test.js"],
  testPathIgnorePatterns: ["<rootDir>/__tests__/integration/"],
  coverageReporters: ["text-summary", "lcov", "clover"],
  testTimeout: 180000,
  setupFilesAfterEnv: ["<rootDir>/setupTests.js"],
};
