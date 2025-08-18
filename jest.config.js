/**
 * Jest Configuration for New TDD Structure
 * Runs tests in test/ directory for parallel development
 */
module.exports = {
  testMatch: ['<rootDir>/test/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/test/setup/jest.setup.js'],
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['server/**/*.js', 'integration.js', '!server/**/*.test.js'],
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  bail: 1 // Fail fast for TDD
};
