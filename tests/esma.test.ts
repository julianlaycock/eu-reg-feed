import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ESMAAggregator } from '../src/aggregators/esma.js';

const fixture = readFileSync(
  resolve(process.cwd(), 'tests', 'fixtures', 'esma-consultations.html'),
  'utf-8'
);

describe('ESMAAggregator', () => {
  const agg = new ESMAAggregator();

  it('has correct metadata', () => {
    expect(agg.id).toBe('esma');
    expect(agg.jurisdiction).toBe('EU');
  });

  it('parses consultations from the fixture page', () => {
    const events = agg.parse(fixture);
    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      expect(event.type).toBe('consultation');
      expect(event.regulator).toBe('esma');
      expect(event.jurisdiction).toBe('EU');
      expect(event.id).toMatch(/^urn:regevent:esma:\d{4}:/);
      expect(event.url).toMatch(/^https:\/\/www\.esma\.europa\.eu/);
      expect(event.published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(event.response_deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(event.title.length).toBeGreaterThan(0);
    }
  });

  it('partitions every event into open or closed by deadline', () => {
    const events = agg.parse(fixture);
    const open = events.filter(
      e => e.response_deadline && new Date(e.response_deadline) > new Date()
    );
    const closed = events.filter(
      e => e.response_deadline && new Date(e.response_deadline) <= new Date()
    );
    expect(open.length + closed.length).toBe(events.length);
  });

  it('returns no events for unrelated HTML', () => {
    expect(agg.parse('<html><body>no consultations here</body></html>')).toEqual([]);
  });
});
