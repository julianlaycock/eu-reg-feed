/**
 * Loading and caching the feed document, from disk or over HTTP.
 *
 * A feed load is one of three outcomes, and callers must be able to tell them
 * apart: the document loaded and is usable (`ok`); the document was reachable
 * but is not what we expect (`invalid`, meaning bad JSON or an event that fails
 * the RegEvent schema); or the document could not be reached at all
 * (`unavailable`, meaning a missing file, network error, timeout or non-2xx
 * response). Tools turn each of these into a distinct, readable MCP error
 * instead of an uncaught exception, which is the difference between "the CSSF
 * source has been down since Tuesday" and a stack trace.
 */

import { readFile } from 'node:fs/promises';
import { FeedDocumentSchema, type FeedDocument } from './schema.js';
import type { FeedConfig } from './config.js';

export type FeedLoadResult =
  | { status: 'ok'; document: FeedDocument; origin: string }
  | { status: 'invalid'; message: string; origin: string }
  | { status: 'unavailable'; message: string; origin: string };

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function readSource(config: FeedConfig): Promise<{ text: string; origin: string }> {
  if (config.source === 'remote') {
    const text = await fetchWithTimeout(config.remoteUrl, config.fetchTimeoutMs);
    return { text, origin: config.remoteUrl };
  }
  const text = await readFile(config.localPath, 'utf-8');
  return { text, origin: config.localPath };
}

/** Load the feed document fresh, with no cache involved. Exported for tests. */
export async function loadFeedOnce(config: FeedConfig): Promise<FeedLoadResult> {
  let text: string;
  let origin: string;
  try {
    ({ text, origin } = await readSource(config));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const where = config.source === 'remote' ? config.remoteUrl : config.localPath;
    return {
      status: 'unavailable',
      origin: where,
      message: `Could not reach the ${config.source} feed at ${where}: ${detail}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { status: 'invalid', origin, message: `Feed at ${origin} is not valid JSON: ${detail}` };
  }

  const result = FeedDocumentSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map(issue => `  ${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('\n');
    return {
      status: 'invalid',
      origin,
      message: `Feed at ${origin} does not match the expected RegEvent feed shape:\n${issues}`,
    };
  }

  return { status: 'ok', document: result.data, origin };
}

/**
 * A small in-memory cache in front of `loadFeedOnce`.
 *
 * A local file read is cheap, but the default cache still applies to it: a
 * stdio MCP server serves one client for the life of its process, and reading
 * the same 30-some KB file on every single tool call buys nothing. Against the
 * remote source the cache also does the polite thing and avoids fetching
 * GitHub's raw content host once per tool call.
 */
export class FeedCache {
  private cached: { result: FeedLoadResult; loadedAt: number } | null = null;

  constructor(
    private readonly config: FeedConfig,
    private readonly now: () => number = Date.now
  ) {}

  async get(): Promise<FeedLoadResult> {
    if (this.cached && this.cached.result.status === 'ok') {
      if (this.now() - this.cached.loadedAt < this.config.cacheTtlMs) {
        return this.cached.result;
      }
    }
    const result = await loadFeedOnce(this.config);
    this.cached = { result, loadedAt: this.now() };
    return result;
  }

  /** Drop the cached document so the next `get()` reloads from source. */
  invalidate(): void {
    this.cached = null;
  }
}
