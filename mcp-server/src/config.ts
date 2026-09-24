/**
 * Configuration, read once from the environment.
 *
 * Everything here has a default that works out of the box against a checkout
 * of eu-reg-feed sitting next to this package (`../feed/latest.json`), so
 * `npm start` inside `mcp-server/` needs no configuration. Every default can
 * be overridden, so the server also works against the published feed with no
 * local checkout at all.
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/** Default: the sibling `feed/latest.json` in a checkout of the parent repo. */
const DEFAULT_LOCAL_FEED_PATH = resolve(here, '..', '..', 'feed', 'latest.json');

const DEFAULT_REMOTE_FEED_URL =
  'https://raw.githubusercontent.com/julianlaycock/eu-reg-feed/main/feed/latest.json';

const DEFAULT_LOCAL_SCHEMA_PATH = resolve(here, '..', '..', 'schema', 'regevent.schema.json');

const DEFAULT_REMOTE_SCHEMA_URL =
  'https://raw.githubusercontent.com/julianlaycock/eu-reg-feed/main/schema/regevent.schema.json';

export interface FeedConfig {
  /** 'local' reads a file from disk; 'remote' fetches over HTTP(S). */
  source: 'local' | 'remote';
  localPath: string;
  remoteUrl: string;
  schemaLocalPath: string;
  schemaRemoteUrl: string;
  /** How long a loaded feed is reused before the next tool call reloads it. */
  cacheTtlMs: number;
  /** Abort a remote fetch after this many milliseconds. */
  fetchTimeoutMs: number;
}

function parseSource(value: string | undefined): 'local' | 'remote' {
  if (value === 'remote') return 'remote';
  if (value === 'local' || value === undefined) return 'local';
  throw new Error(`EU_REG_FEED_SOURCE must be "local" or "remote", got: ${value}`);
}

function parsePositiveInt(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative number, got: ${value}`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): FeedConfig {
  return {
    source: parseSource(env.EU_REG_FEED_SOURCE),
    localPath: env.EU_REG_FEED_PATH ?? DEFAULT_LOCAL_FEED_PATH,
    remoteUrl: env.EU_REG_FEED_URL ?? DEFAULT_REMOTE_FEED_URL,
    schemaLocalPath: env.EU_REG_FEED_SCHEMA_PATH ?? DEFAULT_LOCAL_SCHEMA_PATH,
    schemaRemoteUrl: env.EU_REG_FEED_SCHEMA_URL ?? DEFAULT_REMOTE_SCHEMA_URL,
    cacheTtlMs: parsePositiveInt(env.EU_REG_FEED_CACHE_TTL_MS, 5 * 60 * 1000, 'EU_REG_FEED_CACHE_TTL_MS'),
    fetchTimeoutMs: parsePositiveInt(env.EU_REG_FEED_FETCH_TIMEOUT_MS, 10_000, 'EU_REG_FEED_FETCH_TIMEOUT_MS'),
  };
}
