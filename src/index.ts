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
export { Aggregator } from './aggregators/base.js';

export type {
  RegEvent,
  RegEventType,
  RegulatorId,
  AggregatorResult,
  BaseAggregator,
  AffectedLegislation,
  Attachment,
} from './types.js';

import { CSSFAggregator } from './aggregators/cssf.js';
import { EBAAggregator } from './aggregators/eba.js';
import { ESMAAggregator } from './aggregators/esma.js';
import type { BaseAggregator, AggregatorResult } from './types.js';

/** Registry of all available aggregators */
export function createAggregators(): BaseAggregator[] {
  return [
    new ESMAAggregator(),
    new EBAAggregator(),
    new CSSFAggregator(),
  ];
}

/** Fetch events from all aggregators */
export async function fetchAll(): Promise<AggregatorResult[]> {
  const aggregators = createAggregators();
  const results: AggregatorResult[] = [];

  for (const agg of aggregators) {
    // Progress goes to stderr: stdout is reserved for the JSON document
    // so `eu-reg-feed fetch | jq` works.
    console.error(`Fetching ${agg.name} (${agg.id})...`);
    const result = await agg.fetch();
    console.error(`  → ${result.events.length} events, ${result.errors.length} errors`);
    results.push(result);
  }

  return results;
}
