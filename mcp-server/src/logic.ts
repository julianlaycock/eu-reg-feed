/**
 * Pure query functions over a loaded feed document.
 *
 * Kept free of MCP types and I/O on purpose: each function takes a
 * `FeedDocument` already in memory and returns plain data, so tests exercise
 * the filtering and ranking logic directly, without a server, a transport, or
 * a fixture file on disk for every case.
 */

import type { FeedDocument, RegEvent, RegEventType, RegulatorId } from './schema.js';
import { KNOWN_REGULATORS, type RegulatorDescriptor } from './regulators.js';

export interface SearchEventsParams {
  regulator?: RegulatorId;
  type?: RegEventType;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

const DEFAULT_SEARCH_LIMIT = 20;
export const MAX_SEARCH_LIMIT = 100;

/**
 * Filter by regulator, event type, a case-insensitive keyword match against
 * title and summary, and a `published` date range, then cap the result.
 *
 * `dateFrom`/`dateTo` bound `published`, not `retrieved_at`: a caller asking
 * "what did ESMA publish in September" means the regulator's own date, not the
 * day our pipeline happened to see it.
 */
export function searchEvents(document: FeedDocument, params: SearchEventsParams): RegEvent[] {
  const keyword = params.keyword?.trim().toLowerCase();
  const fromTime = params.dateFrom ? Date.parse(params.dateFrom) : null;
  const toTime = params.dateTo ? Date.parse(params.dateTo) : null;
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_SEARCH_LIMIT, 1), MAX_SEARCH_LIMIT);

  const matches = document.events.filter(event => {
    if (params.regulator && event.regulator !== params.regulator) return false;
    if (params.type && event.type !== params.type) return false;

    if (keyword) {
      const haystack = `${event.title} ${event.summary ?? ''}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    const publishedTime = Date.parse(event.published);
    if (fromTime !== null && !Number.isNaN(fromTime) && publishedTime < fromTime) return false;
    if (toTime !== null && !Number.isNaN(toTime) && publishedTime > toTime) return false;

    return true;
  });

  return matches.slice(0, limit);
}

export function getEvent(document: FeedDocument, id: string): RegEvent | undefined {
  return document.events.find(event => event.id === id);
}

export interface UpcomingDeadline {
  event: RegEvent;
  daysRemaining: number;
}

/**
 * Events with a `response_deadline` between now and `now + days`, ascending.
 *
 * A deadline that already passed is excluded rather than shown with a
 * negative day count: "upcoming" means still actionable. `status` on the
 * event itself is left untouched; this only decides what belongs in the list.
 */
export function listUpcomingDeadlines(
  document: FeedDocument,
  days: number,
  now: Date = new Date()
): UpcomingDeadline[] {
  const nowTime = now.getTime();
  const horizon = nowTime + days * 24 * 60 * 60 * 1000;

  const results: UpcomingDeadline[] = [];
  for (const event of document.events) {
    if (!event.response_deadline) continue;
    const deadlineTime = Date.parse(event.response_deadline);
    if (Number.isNaN(deadlineTime)) continue;
    if (deadlineTime < nowTime || deadlineTime > horizon) continue;

    const daysRemaining = Math.ceil((deadlineTime - nowTime) / (24 * 60 * 60 * 1000));
    results.push({ event, daysRemaining });
  }

  results.sort((a, b) => Date.parse(a.event.response_deadline!) - Date.parse(b.event.response_deadline!));
  return results;
}

export interface SourcesSummary {
  regulators: RegulatorDescriptor[];
  feed: {
    generated_at: string;
    total_events: number;
    total_errors: number;
    sources: FeedDocument['sources'];
  };
}

/** Merge the static regulator registry with the live feed's per-source stats. */
export function listSources(document: FeedDocument): SourcesSummary {
  return {
    regulators: KNOWN_REGULATORS,
    feed: {
      generated_at: document.generated_at,
      total_events: document.total_events,
      total_errors: document.total_errors,
      sources: document.sources,
    },
  };
}
