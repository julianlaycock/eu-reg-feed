/**
 * Re-emitting the feed in formats consumers already have tools for.
 *
 * The target audience — a compliance officer at a small fund, a journalist —
 * mostly does not write JSON consumers. An .ics of response deadlines drops
 * straight into a calendar, and an Atom feed into any reader. Both are derived
 * views of the same RegEvents; neither adds data of its own.
 */

import type { RegEvent } from './types.js';
import { PACKAGE_VERSION } from './version.js';

const ICS_LINE_LIMIT = 75;

/** Escape a value for an iCalendar text field (RFC 5545 §3.3.11). */
function escapeICS(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold a content line to 75 octets, as RFC 5545 §3.1 requires. */
function foldICSLine(line: string): string {
  if (Buffer.byteLength(line, 'utf8') <= ICS_LINE_LIMIT) return line;

  const parts: string[] = [];
  let current = '';

  for (const char of line) {
    const limit = parts.length === 0 ? ICS_LINE_LIMIT : ICS_LINE_LIMIT - 1;
    if (Buffer.byteLength(current + char, 'utf8') > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);

  return parts.map((part, i) => (i === 0 ? part : ` ${part}`)).join('\r\n');
}

/** `YYYYMMDD` in UTC, the all-day DATE form. */
function icsDate(value: string): string {
  return new Date(value).toISOString().slice(0, 10).replace(/-/g, '');
}

/** `YYYYMMDDTHHMMSSZ`, the UTC DATE-TIME form. */
function icsTimestamp(value: string): string {
  return `${new Date(value).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

/**
 * Calendar of response deadlines.
 *
 * Only events that actually have a `response_deadline` are included — an
 * all-day event on the closing date, with the publication's URL attached.
 */
export function toICS(events: RegEvent[], now = new Date()): string {
  const withDeadlines = events.filter(e => e.response_deadline);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//eu-reg-feed//${PACKAGE_VERSION}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:EU regulatory deadlines',
  ];

  for (const event of withDeadlines) {
    const deadline = icsDate(event.response_deadline as string);
    // DTEND is exclusive for all-day events: the deadline day itself is included.
    const dayAfter = new Date(event.response_deadline as string);
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}`,
      // DTSTAMP is when this calendar object was created (RFC 5545 3.8.7.2);
      // when the pipeline last saw the publication is LAST-MODIFIED.
      `DTSTAMP:${icsTimestamp(now.toISOString())}`,
      `LAST-MODIFIED:${icsTimestamp(event.retrieved_at)}`,
      `DTSTART;VALUE=DATE:${deadline}`,
      `DTEND;VALUE=DATE:${icsDate(dayAfter.toISOString())}`,
      `SUMMARY:${escapeICS(`${event.regulator.toUpperCase()}: ${event.title}`)}`,
      `DESCRIPTION:${escapeICS(
        [event.summary, `Published: ${event.published.slice(0, 10)}`, event.url]
          .filter(Boolean)
          .join('\n')
      )}`,
      `URL:${escapeICS(event.url)}`,
      `CATEGORIES:${escapeICS([event.type, ...event.tags].join(','))}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  // RFC 5545 wants CRLF line endings; the trailing one matters to strict parsers.
  return `${lines.map(foldICSLine).join('\r\n')}\r\n`;
}

function escapeXML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Atom 1.0 rendering of the feed.
 *
 * Deliberately lossy: it carries the fields a reader can show. The JSON feed
 * remains the complete record.
 */
export function toAtom(
  events: RegEvent[],
  options: { selfUrl?: string; title?: string; now?: Date } = {}
): string {
  const now = options.now ?? new Date();
  const selfUrl =
    options.selfUrl ??
    'https://raw.githubusercontent.com/julianlaycock/eu-reg-feed/main/feed/latest.json';
  const title = options.title ?? 'eu-reg-feed — EU regulatory change events';

  const entries = events.map(event => {
    const categories = [event.type, ...event.tags]
      .map(term => `    <category term="${escapeXML(term)}"/>`)
      .join('\n');

    const summaryText = [
      event.summary,
      event.response_deadline ? `Response deadline: ${event.response_deadline} (${event.status})` : null,
      event.affected_legislation.length
        ? `Legislation: ${event.affected_legislation.map(l => l.name).join('; ')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    return [
      '  <entry>',
      `    <id>${escapeXML(event.id)}</id>`,
      `    <title>${escapeXML(event.title)}</title>`,
      `    <link rel="alternate" href="${escapeXML(event.url)}"/>`,
      `    <updated>${new Date(event.published).toISOString()}</updated>`,
      `    <author><name>${escapeXML(event.regulator.toUpperCase())}</name></author>`,
      categories,
      summaryText ? `    <summary>${escapeXML(summaryText)}</summary>` : '',
      '  </entry>',
    ]
      .filter(Boolean)
      .join('\n');
  });

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <title>${escapeXML(title)}</title>`,
    `  <id>${escapeXML(selfUrl)}</id>`,
    `  <link rel="self" href="${escapeXML(selfUrl)}"/>`,
    `  <updated>${now.toISOString()}</updated>`,
    `  <generator version="${escapeXML(PACKAGE_VERSION)}">eu-reg-feed</generator>`,
    ...entries,
    '</feed>',
    '',
  ].join('\n');
}
