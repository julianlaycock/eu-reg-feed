import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CSSFAggregator } from '../src/aggregators/cssf.js';

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
      expect(event.id).toMatch(/^urn:regevent:cssf:\d{4}:/);
      expect(event.regulator).toBe('cssf');
      expect(event.jurisdiction).toBe('LU');
      expect(event.title.length).toBeGreaterThan(0);
      expect(event.url).toMatch(/^https:\/\/www\.cssf\.lu/);
      expect(event.published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(event.title_lang).toBe('en');
    }
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
});
