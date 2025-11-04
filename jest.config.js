module.exports = {
  preset: '@backstage/cli/config/jest',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': '@backstage/cli/config/jestTsTransform',
  },
};
