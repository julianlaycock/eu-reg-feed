/**
 * Live integration test config — hits real regulator endpoints.
 * Run with: npm run test:live
 * Not part of CI: regulator sites change without notice and these tests
 * verify their current behaviour, not ours.
 */
import base from './jest.config.mjs';

export default {
  ...base,
  testMatch: ['**/tests/live/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
