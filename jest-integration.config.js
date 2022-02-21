module.exports = {
  clearMocks: true,
  coverageDirectory: "coverage",
  testEnvironment: "node",
  collectCoverage: true,
  collectCoverageFrom: ["<rootDir>/src/**/*.js"],
  testMatch: ["<rootDir>/__tests__/integration/**/*.test.js"],
  coverageDirectory: "coverage",
  coverageReporters: ["text-summary", "lcov", "clover"],
  testTimeout: 20 * 60 * 1000, // 20 minutes seems reasonable for slow integration tests. May be adjusted with optimizations
  setupFilesAfterEnv: ["<rootDir>/setupTests-integration.js"],
};
