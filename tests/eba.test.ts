import { readFileSync } from 'fs';
import { resolve } from 'path';
import { EBAAggregator } from '../src/aggregators/eba.js';

const fixture = readFileSync(
  resolve(process.cwd(), 'tests', 'fixtures', 'eba-feed.xml'),
  'utf-8'
);

describe('EBAAggregator', () => {
  const agg = new EBAAggregator();

  it('has correct metadata', () => {
    expect(agg.id).toBe('eba');
    expect(agg.jurisdiction).toBe('EU');
    expect(agg.url).toBe('https://www.eba.europa.eu/rss.xml');
  });

  it('parses the fixture RSS feed', () => {
    const events = agg.parse(fixture);
    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      expect(event.id).toMatch(/^urn:regevent:eba:\d{4}:/);
      expect(event.regulator).toBe('eba');
      expect(event.jurisdiction).toBe('EU');
      expect(event.title.length).toBeGreaterThan(0);
      expect(event.url).toMatch(/^https:\/\/www\.eba\.europa\.eu/);
      expect(event.published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(event.title_lang).toBe('en');
    }
  });

  it('classifies consultations correctly', () => {
    const events = agg.parse(fixture);
    for (const c of events.filter(e => e.type === 'consultation')) {
      expect(c.title.toLowerCase()).toContain('consult');
    }
  });

  it('returns no events for an empty feed', () => {
    expect(
      agg.parse('<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>')
    ).toEqual([]);
  });
});
