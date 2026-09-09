import { createAggregators, fetchAll } from '../src/index.js';

describe('createAggregators', () => {
  it('registers each regulator exactly once', () => {
    const ids = createAggregators().map(a => a.id);
    expect(ids).toEqual(['esma', 'eba', 'cssf']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every aggregator the metadata the feed document needs', () => {
    for (const agg of createAggregators()) {
      expect(agg.name.length).toBeGreaterThan(0);
      expect(agg.jurisdiction).toMatch(/^[A-Z]{2}$/);
      expect(agg.url).toMatch(/^https:\/\//);
    }
  });
});

describe('fetchAll', () => {
  /**
   * `--source` used to filter after fetching, so asking for one regulator still
   * hit all three. Filtering first is what makes this assertion offline-safe.
   */
  it('makes no request at all when the source name matches nothing', async () => {
    const messages: string[] = [];
    const results = await fetchAll({ source: 'no-such-regulator', delayMs: 0, log: m => messages.push(m) });

    expect(results).toEqual([]);
    expect(messages).toEqual([]);
  });
});
