import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadConfig, type FeedConfig } from '../src/config.js';

const here = dirname(fileURLToPath(import.meta.url));

/** A config pointed at the fixture feed instead of a real checkout, cache disabled. */
export function fixtureConfig(overrides: Partial<FeedConfig> = {}): FeedConfig {
  return {
    ...loadConfig({}),
    source: 'local',
    localPath: resolve(here, 'fixtures', 'feed.json'),
    schemaLocalPath: resolve(here, '..', '..', 'schema', 'regevent.schema.json'),
    cacheTtlMs: 0,
    ...overrides,
  };
}
