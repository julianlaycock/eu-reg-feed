/**
 * Unit test config — runs offline against fixtures in tests/fixtures/.
 * Live-network integration tests live in tests/live/ (see jest.live.config.mjs).
 */
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: { rootDir: '.', isolatedModules: true },
      },
    ],
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/tests/live/'],
};
