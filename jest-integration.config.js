module.exports = {
  clearMocks: true,
  coverageDirectory: 'coverage-integration',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.js'],
  testMatch: ['<rootDir>/__tests__/integration/**/*.test.js'],
  coverageReporters: ['text-summary', 'lcov', 'clover'],
  testTimeout: 20 * 60 * 1000, // May be adjusted with optimizations
  setupFilesAfterEnv: ['<rootDir>/setupTests-integration.js'],
};
