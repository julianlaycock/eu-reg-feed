import { readFileSync } from 'fs';
import { resolve } from 'path';
import { EBAAggregator } from '../src/aggregators/eba.js';
import { assertValidRegEvents } from './conformance.js';

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
      expect(event.id).toMatch(/^urn:regevent:v2:eba:[A-Za-z0-9._~-]+$/);
      expect(event.regulator).toBe('eba');
      expect(event.jurisdiction).toBe('EU');
      expect(event.title.length).toBeGreaterThan(0);
      expect(event.url).toMatch(/^https:\/\/www\.eba\.europa\.eu/);
      expect(event.published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(event.title_lang).toBe('en');
      expect(event.content_hash).toMatch(/^[0-9a-f]{16}$/);
      expect(event.retrieved_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(['open', 'closed', 'unknown']).toContain(event.status);
    }
  });

  it('emits schema-conformant events with unique ids', () => {
    assertValidRegEvents(agg.parse(fixture));
  });

  /**
   * Regression guard for the scheme v1 identifier bug. Every guid in this
   * fixture ends in the same " at https://www.eba.europa.eu" tail, so taking
   * the trailing characters of the guid collapsed all ten publications onto a
   * single id and nine of them vanished from any consumer keyed on `id`.
   */
  it('gives every publication in the fixture a distinct id', () => {
    const events = agg.parse(fixture);
    expect(events.length).toBe(10);
    expect(new Set(events.map(e => e.id)).size).toBe(events.length);
  });

  it('uses the Drupal node id from the guid as the ref', () => {
    const ids = agg.parse(fixture).map(e => e.id);
    expect(ids).toContain('urn:regevent:v2:eba:node-17072');
    expect(ids).toContain('urn:regevent:v2:eba:node-19863');
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

  it('skips a malformed item without losing the rest of the feed', () => {
    const broken = fixture.replace(
      /<pubDate>[^<]*<\/pubDate>/,
      '<pubDate>not a date</pubDate>'
    );
    const events = agg.parse(broken);
    expect(events.length).toBe(9);
    assertValidRegEvents(events);
  });
});
