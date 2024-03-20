// Minor helper for test development. Allows for specific file testing.
const mainTestMatch = process.env.SPECIFIC_INTEGRATION_TEST_FILE
  ? `<rootDir>/__tests__/integration/**/${process.env.SPECIFIC_INTEGRATION_TEST_FILE}.test.js`
  : '<rootDir>/__tests__/integration/**/*.test.js';

module.exports = {
  testRunner: 'jest-circus/runner',
  clearMocks: true,
  coverageDirectory: 'coverage-integration',
  testEnvironment: './CustomEnvironment.js',
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.js'],
  testMatch: [mainTestMatch],
  coverageReporters: ['text-summary', 'lcov', 'clover'],
  testTimeout: 20 * 60 * 1000, // May be adjusted with optimizations
  setupFilesAfterEnv: ['<rootDir>/setupTests-integration.js'],
};
