module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/../tests'],
  testMatch: ['**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageDirectory: '../reports/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};