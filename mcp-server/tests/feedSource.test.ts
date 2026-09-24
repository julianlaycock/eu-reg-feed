import { describe, it, expect, vi, afterEach } from 'vitest';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadFeedOnce, FeedCache } from '../src/feedSource.js';
import { fixtureConfig } from './testConfig.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadFeedOnce (local)', () => {
  it('loads and validates the fixture feed', async () => {
    const result = await loadFeedOnce(fixtureConfig());
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.document.events).toHaveLength(5);
    }
  });

  it('reports "unavailable" when the file does not exist', async () => {
    const result = await loadFeedOnce(fixtureConfig({ localPath: '/no/such/file/feed.json' }));
    expect(result.status).toBe('unavailable');
    if (result.status === 'unavailable') {
      expect(result.message).toContain('local');
    }
  });

  it('reports "invalid" for malformed JSON', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'eu-reg-feed-mcp-'));
    const path = join(dir, 'broken.json');
    await writeFile(path, '{ not valid json', 'utf-8');
    try {
      const result = await loadFeedOnce(fixtureConfig({ localPath: path }));
      expect(result.status).toBe('invalid');
      if (result.status === 'invalid') {
        expect(result.message).toContain('not valid JSON');
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('reports "invalid" when the document does not match the RegEvent shape', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'eu-reg-feed-mcp-'));
    const path = join(dir, 'wrong-shape.json');
    await writeFile(path, JSON.stringify({ hello: 'world' }), 'utf-8');
    try {
      const result = await loadFeedOnce(fixtureConfig({ localPath: path }));
      expect(result.status).toBe('invalid');
      if (result.status === 'invalid') {
        expect(result.message).toContain('does not match the expected RegEvent feed shape');
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('loadFeedOnce (remote)', () => {
  it('fetches and validates over HTTP', async () => {
    const doc = (await loadFeedOnce(fixtureConfig())) as Extract<
      Awaited<ReturnType<typeof loadFeedOnce>>,
      { status: 'ok' }
    >;
    const body = JSON.stringify(doc.document);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body, { status: 200 }))
    );

    const result = await loadFeedOnce(
      fixtureConfig({ source: 'remote', remoteUrl: 'https://example.invalid/feed.json' })
    );
    expect(result.status).toBe('ok');
  });

  it('reports "unavailable" on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not found', { status: 404, statusText: 'Not Found' }))
    );

    const result = await loadFeedOnce(
      fixtureConfig({ source: 'remote', remoteUrl: 'https://example.invalid/feed.json' })
    );
    expect(result.status).toBe('unavailable');
    if (result.status === 'unavailable') {
      expect(result.message).toContain('404');
    }
  });

  it('reports "unavailable" when the fetch throws (network error)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('getaddrinfo ENOTFOUND example.invalid');
      })
    );

    const result = await loadFeedOnce(
      fixtureConfig({ source: 'remote', remoteUrl: 'https://example.invalid/feed.json' })
    );
    expect(result.status).toBe('unavailable');
  });
});

describe('FeedCache', () => {
  it('serves a cached document without reloading until the TTL elapses', async () => {
    let calls = 0;
    let now = 1_000_000;
    const config = fixtureConfig({ cacheTtlMs: 1000 });
    const cache = new FeedCache(config, () => now);

    // Wrap loadFeedOnce indirectly by counting fetch calls via the local path read count is hard;
    // instead assert on loadedAt staying fixed across calls inside the TTL window.
    const first = await cache.get();
    calls++;
    const second = await cache.get();
    expect(second).toBe(first); // same object reference: cache hit, no reload

    now += 2000; // past the TTL
    const third = await cache.get();
    expect(third).not.toBe(first); // reloaded
    expect(calls).toBe(1);
  });

  it('reloads immediately after invalidate()', async () => {
    let now = 0;
    const cache = new FeedCache(fixtureConfig({ cacheTtlMs: 60_000 }), () => now);
    const first = await cache.get();
    cache.invalidate();
    const second = await cache.get();
    expect(second).not.toBe(first);
  });
});
