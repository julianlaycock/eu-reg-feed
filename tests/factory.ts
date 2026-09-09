/**
 * Synthetic RegEvents for tests that are about assembly, archiving or export
 * rather than about parsing a particular regulator's markup.
 */

import { contentHash, makeEventId } from '../src/ids.js';
import type { AggregatorResult, RegEvent, RegulatorId } from '../src/types.js';

export function makeEvent(overrides: Partial<RegEvent> = {}): RegEvent {
  const base = {
    regulator: 'eba' as RegulatorId,
    title: 'Consultation on draft technical standards',
    summary: null as string | null,
    url: 'https://www.eba.europa.eu/node/1',
    published: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };

  const event: RegEvent = {
    id: makeEventId(base.regulator, 'node-1'),
    type: 'consultation',
    regulator: base.regulator,
    jurisdiction: 'EU',
    title: base.title,
    title_lang: 'en',
    summary: base.summary,
    url: base.url,
    published: base.published,
    effective_date: null,
    response_deadline: null,
    affected_legislation: [],
    tags: [],
    attachments: [],
    status: 'unknown',
    retrieved_at: '2026-09-09T06:17:00.000Z',
    content_hash: contentHash(base),
    ...overrides,
  };

  return event;
}

export function makeResult(
  regulator: RegulatorId,
  events: RegEvent[],
  errors: string[] = []
): AggregatorResult {
  return {
    regulator,
    events,
    fetched_at: '2026-09-09T06:17:00.000Z',
    errors,
  };
}
