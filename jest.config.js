module.exports = {
  clearMocks: true,
  coverageDirectory: "coverage",
  testEnvironment: "node",
  collectCoverage: true,
  collectCoverageFrom: ["<rootDir>/server.js"],
  testMatch: ["<rootDir>/__tests__/**/*.test.js"],
  coverageDirectory: "coverage",
  coverageReporters: ["text-summary", "lcov"],
  testTimeout: 180000,
  setupFilesAfterEnv: ["<rootDir>/setupTests.js"],
};
