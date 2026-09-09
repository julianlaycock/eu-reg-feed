import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CSSFAggregator } from '../src/aggregators/cssf.js';
import { assertValidRegEvents } from './conformance.js';

const fixture = readFileSync(
  resolve(process.cwd(), 'tests', 'fixtures', 'cssf-feed.xml'),
  'utf-8'
);

describe('CSSFAggregator', () => {
  const agg = new CSSFAggregator();

  it('has correct metadata', () => {
    expect(agg.id).toBe('cssf');
    expect(agg.jurisdiction).toBe('LU');
    expect(agg.url).toBe('https://www.cssf.lu/en/feed/');
  });

  it('parses the fixture RSS feed', () => {
    const events = agg.parse(fixture);
    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      expect(event.id).toMatch(/^urn:regevent:v2:cssf:[A-Za-z0-9._~-]+$/);
      expect(event.regulator).toBe('cssf');
      expect(event.jurisdiction).toBe('LU');
      expect(event.title.length).toBeGreaterThan(0);
      expect(event.url).toMatch(/^https:\/\/www\.cssf\.lu/);
      expect(event.published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(event.title_lang).toBe('en');
      expect(event.content_hash).toMatch(/^[0-9a-f]{16}$/);
    }
  });

  it('emits schema-conformant events with unique ids', () => {
    assertValidRegEvents(agg.parse(fixture));
  });

  it('classifies warnings correctly', () => {
    const events = agg.parse(fixture);
    for (const w of events.filter(e => e.type === 'warning')) {
      expect(w.title.toLowerCase()).toContain('warning');
    }
  });

  it('returns no events for an empty feed', () => {
    expect(
      agg.parse('<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>')
    ).toEqual([]);
  });

  /**
   * One unparseable item used to zero the whole source: CSSF had no per-item
   * guard, so a single bad pubDate threw out of the parse loop and the run
   * reported no Luxembourg events at all rather than all-but-one.
   */
  it('skips a malformed item without losing the rest of the feed', () => {
    const total = agg.parse(fixture).length;
    const broken = fixture.replace(
      /<pubDate>[^<]*<\/pubDate>/,
      '<pubDate>not a date</pubDate>'
    );
    const events = agg.parse(broken);
    expect(events.length).toBe(total - 1);
    assertValidRegEvents(events);
  });
});
