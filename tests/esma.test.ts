import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ESMAAggregator } from '../src/aggregators/esma.js';
import { assertValidRegEvents } from './conformance.js';

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
      expect(event.id).toMatch(/^urn:regevent:v2:esma:[A-Za-z0-9._~-]+$/);
      expect(event.url).toMatch(/^https:\/\/www\.esma\.europa\.eu/);
      expect(event.published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(event.response_deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(event.title.length).toBeGreaterThan(0);
    }
  });

  it('emits schema-conformant events with unique ids', () => {
    assertValidRegEvents(agg.parse(fixture));
  });

  /**
   * `status` is derived from the deadline against the run clock, so every
   * consultation lands in open or closed and none is left unknown.
   */
  it('partitions every event into open or closed by deadline', () => {
    const events = agg.parse(fixture);
    const open = events.filter(e => e.status === 'open');
    const closed = events.filter(e => e.status === 'closed');
    expect(open.length + closed.length).toBe(events.length);

    const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
    for (const event of open) {
      expect(new Date(event.response_deadline as string).getTime()).toBeGreaterThanOrEqual(today);
    }
  });

  /**
   * The summary used to hard-code "Open consultation", which stayed in the text
   * long after the window closed. Response state belongs in `status`, not prose.
   */
  it('never bakes a stale open/closed claim into the summary', () => {
    for (const event of agg.parse(fixture)) {
      expect(event.summary ?? '').not.toMatch(/open consultation/i);
    }
  });

  it('returns no events for unrelated HTML', () => {
    expect(agg.parse('<html><body>no consultations here</body></html>')).toEqual([]);
  });
});
