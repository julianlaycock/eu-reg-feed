/**
 * Assembling the published feed document from aggregator results.
 *
 * Kept out of the CLI so the assembly rules — sort order, deduplication,
 * collision reporting — are testable without spawning a process or touching
 * the network.
 */

import type { AggregatorResult, RegEvent, RegulatorId } from './types.js';
import { PACKAGE_VERSION } from './version.js';

export const SCHEMA_URL =
  'https://raw.githubusercontent.com/julianlaycock/eu-reg-feed/main/schema/regevent.schema.json';

export interface FeedSource {
  regulator: RegulatorId;
  events: number;
  errors: string[];
  fetched_at: string;
}

export interface FeedDocument {
  schema: string;
  version: string;
  generated_at: string;
  total_events: number;
  total_errors: number;
  sources: FeedSource[];
  events: RegEvent[];
}

export interface BuildFeedResult {
  document: FeedDocument;
  /**
   * Ids that appeared more than once with *different* content. An identifier
   * scheme that produces these is silently dropping real publications, which is
   * exactly the bug that shipped under scheme v1 — so they are surfaced as
   * errors rather than quietly deduplicated away.
   */
  collisions: string[];
}

/**
 * Merge, deduplicate and sort the events from every source.
 *
 * Deduplication keeps the first occurrence of an id. Two records with the same
 * id and the same `content_hash` are the same publication seen twice (harmless,
 * e.g. an item present in two feeds); the same id with a different hash is an
 * identifier collision and is reported.
 */
export function buildFeed(results: AggregatorResult[], now = new Date()): BuildFeedResult {
  const seen = new Map<string, RegEvent>();
  const collisions: string[] = [];

  for (const result of results) {
    for (const event of result.events) {
      const existing = seen.get(event.id);
      if (!existing) {
        seen.set(event.id, event);
        continue;
      }
      if (existing.content_hash !== event.content_hash) {
        collisions.push(
          `id collision: ${event.id} maps to more than one publication (${existing.url} and ${event.url})`
        );
      }
    }
  }

  const events = [...seen.values()].sort(
    (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
  );

  const sourceErrors = results.flatMap(r => r.errors);

  return {
    document: {
      schema: SCHEMA_URL,
      version: PACKAGE_VERSION,
      generated_at: now.toISOString(),
      total_events: events.length,
      total_errors: sourceErrors.length + collisions.length,
      sources: results.map(r => ({
        regulator: r.regulator,
        events: r.events.length,
        errors: r.errors,
        fetched_at: r.fetched_at,
      })),
      events,
    },
    collisions,
  };
}
