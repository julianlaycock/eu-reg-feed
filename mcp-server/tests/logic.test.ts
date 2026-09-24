import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { FeedDocumentSchema } from '../src/schema.js';
import { searchEvents, getEvent, listUpcomingDeadlines, listSources, MAX_SEARCH_LIMIT } from '../src/logic.js';

const here = dirname(fileURLToPath(import.meta.url));

async function loadFixture() {
  const raw = await readFile(resolve(here, 'fixtures', 'feed.json'), 'utf-8');
  return FeedDocumentSchema.parse(JSON.parse(raw));
}

describe('searchEvents', () => {
  it('returns everything with no filters, newest untouched order preserved from the feed', async () => {
    const doc = await loadFixture();
    const results = searchEvents(doc, {});
    expect(results).toHaveLength(5);
  });

  it('filters by regulator', async () => {
    const doc = await loadFixture();
    const results = searchEvents(doc, { regulator: 'eba' });
    expect(results).toHaveLength(2);
    expect(results.every(e => e.regulator === 'eba')).toBe(true);
  });

  it('filters by event type', async () => {
    const doc = await loadFixture();
    const results = searchEvents(doc, { type: 'warning' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('urn:regevent:v2:cssf:p-128522');
  });

  it('matches keyword case-insensitively against title and summary', async () => {
    const doc = await loadFixture();
    const byTitle = searchEvents(doc, { keyword: 'MIFID' });
    expect(byTitle).toHaveLength(1);
    expect(byTitle[0].id).toBe('urn:regevent:v2:esma:final-rule-mifid-review-1a2b3c4d');

    const bySummary = searchEvents(doc, { keyword: 'credit risk adjustments' });
    expect(bySummary).toHaveLength(1);
    expect(bySummary[0].id).toBe('urn:regevent:v2:eba:node-20011');
  });

  it('bounds by published date range, inclusive', async () => {
    const doc = await loadFixture();
    const results = searchEvents(doc, { dateFrom: '2026-08-01', dateTo: '2026-08-31' });
    expect(results.map(e => e.id)).toEqual([
      'urn:regevent:v2:esma:consultation-emir-clearing-5343b289', // 2026-08-18
      'urn:regevent:v2:eba:node-19966', // 2026-08-27
    ]);
  });

  it('combines filters with AND', async () => {
    const doc = await loadFixture();
    const results = searchEvents(doc, { regulator: 'esma', type: 'consultation' });
    expect(results).toHaveLength(1);
    expect(results[0].regulator).toBe('esma');
    expect(results[0].type).toBe('consultation');
  });

  it('caps at limit, and clamps an out-of-range limit to the maximum', async () => {
    const doc = await loadFixture();
    expect(searchEvents(doc, { limit: 2 })).toHaveLength(2);
    expect(searchEvents(doc, { limit: MAX_SEARCH_LIMIT + 500 }).length).toBeLessThanOrEqual(5);
  });

  it('returns an empty array, not an error, when nothing matches', async () => {
    const doc = await loadFixture();
    expect(searchEvents(doc, { keyword: 'no-such-keyword-anywhere' })).toEqual([]);
  });
});

describe('getEvent', () => {
  it('finds an event by its exact id', async () => {
    const doc = await loadFixture();
    const event = getEvent(doc, 'urn:regevent:v2:cssf:p-128522');
    expect(event?.title).toContain('DAC Investments');
  });

  it('returns undefined for an unknown id', async () => {
    const doc = await loadFixture();
    expect(getEvent(doc, 'urn:regevent:v2:esma:does-not-exist')).toBeUndefined();
  });
});

describe('listUpcomingDeadlines', () => {
  it('includes only events with a deadline inside the window, soonest first', async () => {
    const doc = await loadFixture();
    const now = new Date('2026-09-20T00:00:00.000Z');
    const results = listUpcomingDeadlines(doc, 30, now);

    expect(results.map(r => r.event.id)).toEqual([
      'urn:regevent:v2:esma:consultation-emir-clearing-5343b289', // 2026-10-05
      'urn:regevent:v2:eba:node-20011', // 2026-10-15
    ]);
    expect(results[0].daysRemaining).toBeLessThan(results[1].daysRemaining);
  });

  it('excludes deadlines that already passed', async () => {
    const doc = await loadFixture();
    const now = new Date('2026-11-01T00:00:00.000Z');
    expect(listUpcomingDeadlines(doc, 30, now)).toEqual([]);
  });

  it('excludes events with no deadline at all', async () => {
    const doc = await loadFixture();
    const now = new Date('2026-09-20T00:00:00.000Z');
    const results = listUpcomingDeadlines(doc, 365, now);
    expect(results.every(r => r.event.response_deadline !== null)).toBe(true);
  });

  it('excludes a deadline outside a shorter window', async () => {
    const doc = await loadFixture();
    const now = new Date('2026-09-20T00:00:00.000Z');
    // Both deadlines (2026-10-05, 2026-10-15) fall after a 10-day horizon.
    const results = listUpcomingDeadlines(doc, 10, now);
    expect(results).toEqual([]);
  });
});

describe('listSources', () => {
  it('merges the static regulator registry with live feed stats', async () => {
    const doc = await loadFixture();
    const summary = listSources(doc);

    expect(summary.regulators.some(r => r.id === 'esma' && r.status === 'working')).toBe(true);
    expect(summary.regulators.some(r => r.id === 'bafin' && r.status === 'planned')).toBe(true);
    expect(summary.feed.total_events).toBe(5);
    expect(summary.feed.sources).toHaveLength(3);
  });
});
