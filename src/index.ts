/**
 * eu-reg-feed — Open standard and reference implementation
 * for machine-readable EU regulatory change feeds.
 *
 * Apache 2.0 License
 * https://github.com/julianlaycock/eu-reg-feed
 */

export { CSSFAggregator } from './aggregators/cssf.js';
export { EBAAggregator } from './aggregators/eba.js';
export { ESMAAggregator } from './aggregators/esma.js';
export { Aggregator, deriveStatus } from './aggregators/base.js';
export { buildFeed, SCHEMA_URL } from './feed.js';
export { updateArchive, DEFAULT_ARCHIVE_DIR } from './archive.js';
export { toICS, toAtom } from './exports.js';
export { makeEventId, eventRef, contentHash, canonicalUrl, ID_SCHEME_VERSION } from './ids.js';
export { extractLegislation } from './legislation.js';
export { PACKAGE_VERSION } from './version.js';

export type {
  RegEvent,
  RegEventType,
  RegEventStatus,
  RegulatorId,
  AggregatorResult,
  BaseAggregator,
  AffectedLegislation,
  Attachment,
} from './types.js';
export type { FeedDocument, FeedSource, BuildFeedResult } from './feed.js';
export type { ArchiveFile, ArchivedEvent, ArchiveRevision, ArchiveUpdate } from './archive.js';

import { CSSFAggregator } from './aggregators/cssf.js';
import { EBAAggregator } from './aggregators/eba.js';
import { ESMAAggregator } from './aggregators/esma.js';
import type { BaseAggregator, AggregatorResult, RegulatorId } from './types.js';

/** Registry of all available aggregators */
export function createAggregators(): BaseAggregator[] {
  return [
    new ESMAAggregator(),
    new EBAAggregator(),
    new CSSFAggregator(),
  ];
}

export interface FetchAllOptions {
  /** Only fetch this regulator. */
  source?: string | null;
  /** Pause between sources, in ms. Keeps the crawl polite; set 0 in tests. */
  delayMs?: number;
  /** Progress sink. Defaults to stderr so stdout stays a clean JSON document. */
  log?: (message: string) => void;
}

/** Fetch events from all aggregators (or one, with `source`). */
export async function fetchAll(options: FetchAllOptions = {}): Promise<AggregatorResult[]> {
  const { source = null, delayMs = 2000, log = (message: string) => console.error(message) } = options;

  const aggregators = createAggregators().filter(agg => !source || agg.id === (source as RegulatorId));
  const results: AggregatorResult[] = [];

  for (const [index, agg] of aggregators.entries()) {
    log(`Fetching ${agg.name} (${agg.id})...`);
    const result = await agg.fetch();
    log(`  → ${result.events.length} events, ${result.errors.length} errors`);
    results.push(result);

    // Respectful scraping: space out requests to different regulators.
    if (delayMs > 0 && index < aggregators.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
