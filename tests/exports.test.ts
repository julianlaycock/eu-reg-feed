import { toAtom, toICS } from '../src/exports.js';
import { PACKAGE_VERSION } from '../src/version.js';
import { makeEvent } from './factory.js';

const NOW = new Date('2026-09-09T06:17:00.000Z');

const withDeadline = makeEvent({
  id: 'urn:regevent:v2:esma:node-5343',
  regulator: 'esma',
  title: 'Consultation on the reporting framework, part 1; draft RTS',
  summary: 'Responses published',
  url: 'https://www.esma.europa.eu/node/5343',
  response_deadline: '2026-10-31',
  status: 'open',
  tags: ['emir', 'reporting'],
});

const withoutDeadline = makeEvent({ id: 'urn:regevent:v2:eba:node-1' });

describe('toICS', () => {
  const ics = toICS([withDeadline, withoutDeadline], NOW);

  it('emits a well-formed calendar with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain(`PRODID:-//eu-reg-feed//${PACKAGE_VERSION}//EN`);
    expect(ics.split('\n').every(line => line === '' || line.endsWith('\r'))).toBe(true);
  });

  it('includes only events that have a response deadline', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain('UID:urn:regevent:v2:esma:node-5343');
    expect(ics).not.toContain('UID:urn:regevent:v2:eba:node-1');
  });

  it('makes the deadline day itself part of the all-day event', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261031');
    // DTEND is exclusive, so it is the day after the deadline.
    expect(ics).toContain('DTEND;VALUE=DATE:20261101');
  });

  it('escapes commas and semicolons in text fields (RFC 5545 3.3.11)', () => {
    // Unfold first: a long line is split across continuations by design.
    const unfolded = ics.replace(/\r\n /g, '');
    const summaryLine = unfolded.split('\r\n').find(line => line.startsWith('SUMMARY:'));
    expect(summaryLine).toBeDefined();
    expect(summaryLine).toContain('reporting framework\\, part 1\\; draft RTS');
  });

  it('folds content lines to 75 octets', () => {
    for (const line of ics.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
  });

  it('emits an empty calendar rather than failing when nothing has a deadline', () => {
    const empty = toICS([withoutDeadline], NOW);
    expect(empty).not.toContain('BEGIN:VEVENT');
    expect(empty).toContain('END:VCALENDAR');
  });
});

describe('toAtom', () => {
  const atom = toAtom([withDeadline, withoutDeadline], { now: NOW });

  it('emits an Atom 1.0 feed with one entry per event', () => {
    expect(atom.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
    expect(atom).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(atom.match(/<entry>/g)).toHaveLength(2);
    expect(atom).toContain(`<updated>${NOW.toISOString()}</updated>`);
  });

  it('carries the deadline and its state into the entry summary', () => {
    expect(atom).toContain('Response deadline: 2026-10-31 (open)');
  });

  it('escapes XML metacharacters in titles', () => {
    const risky = makeEvent({ title: 'Q&A on "MiFID II" <draft>' });
    expect(toAtom([risky], { now: NOW })).toContain(
      '<title>Q&amp;A on &quot;MiFID II&quot; &lt;draft&gt;</title>'
    );
  });

  it('accepts an overridden self link and title', () => {
    const feed = toAtom([], { now: NOW, selfUrl: 'https://example.org/feed', title: 'Custom' });
    expect(feed).toContain('<link rel="self" href="https://example.org/feed"/>');
    expect(feed).toContain('<title>Custom</title>');
  });
});
