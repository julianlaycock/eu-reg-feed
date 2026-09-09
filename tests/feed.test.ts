import { buildFeed, SCHEMA_URL } from '../src/feed.js';
import { PACKAGE_VERSION } from '../src/version.js';
import { makeEvent, makeResult } from './factory.js';
import { assertValidRegEvent } from './conformance.js';

const NOW = new Date('2026-09-09T06:17:00.000Z');

describe('buildFeed', () => {
  it('merges sources and sorts events newest first', () => {
    const older = makeEvent({ id: 'urn:regevent:v2:eba:node-1', published: '2026-08-01T00:00:00.000Z' });
    const newer = makeEvent({
      id: 'urn:regevent:v2:cssf:p-2',
      regulator: 'cssf',
      published: '2026-09-05T00:00:00.000Z',
    });

    const { document } = buildFeed([makeResult('eba', [older]), makeResult('cssf', [newer])], NOW);

    expect(document.events.map(e => e.id)).toEqual([newer.id, older.id]);
    expect(document.total_events).toBe(2);
    expect(document.total_errors).toBe(0);
    expect(document.schema).toBe(SCHEMA_URL);
    expect(document.version).toBe(PACKAGE_VERSION);
    expect(document.generated_at).toBe(NOW.toISOString());
    for (const event of document.events) assertValidRegEvent(event);
  });

  it('reports each source with its own error list', () => {
    const { document } = buildFeed(
      [makeResult('eba', [makeEvent()]), makeResult('esma', [], ['HTTP 503'])],
      NOW
    );

    expect(document.sources).toHaveLength(2);
    expect(document.sources[1]).toMatchObject({ regulator: 'esma', events: 0, errors: ['HTTP 503'] });
    expect(document.total_errors).toBe(1);
  });

  it('keeps the first copy of a duplicate that is genuinely the same publication', () => {
    const event = makeEvent();
    const { document, collisions } = buildFeed(
      [makeResult('eba', [event]), makeResult('eba', [{ ...event }])],
      NOW
    );

    expect(document.events).toHaveLength(1);
    expect(collisions).toEqual([]);
    expect(document.total_errors).toBe(0);
  });

  /**
   * The failure mode that shipped under identifier scheme v1: two distinct
   * publications sharing one id. Deduplicating them silently is what hid the
   * bug for weeks, so a same-id/different-content pair is counted as an error.
   */
  it('reports an id collision instead of silently dropping a publication', () => {
    const first = makeEvent({ id: 'urn:regevent:v2:eba:node-1', url: 'https://www.eba.europa.eu/node/1' });
    const second = makeEvent({
      id: 'urn:regevent:v2:eba:node-1',
      url: 'https://www.eba.europa.eu/node/2',
      title: 'A different publication entirely',
    });

    const { document, collisions } = buildFeed([makeResult('eba', [first, second])], NOW);

    expect(collisions).toHaveLength(1);
    expect(collisions[0]).toContain('urn:regevent:v2:eba:node-1');
    expect(document.total_errors).toBe(1);
  });

  it('produces an empty but valid document when every source failed', () => {
    const { document } = buildFeed([makeResult('eba', [], ['timeout'])], NOW);

    expect(document.events).toEqual([]);
    expect(document.total_events).toBe(0);
    expect(document.total_errors).toBe(1);
  });
});
