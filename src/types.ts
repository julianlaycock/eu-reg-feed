/**
 * eu-reg-feed — Open standard for machine-readable EU regulatory change feeds
 * Apache 2.0 License
 */

export type RegEventType =
  | 'consultation'
  | 'final_rule'
  | 'guidance'
  | 'guideline'
  | 'opinion'
  | 'qa_update'
  | 'transposition'
  | 'deadline'
  | 'warning'
  | 'speech'
  | 'report'
  | 'delegated_act'
  | 'implementing_technical_standard'
  | 'regulatory_technical_standard';

export type RegulatorId =
  | 'esma'
  | 'eba'
  | 'eiopa'
  | 'eurlex'
  | 'bafin'
  | 'cssf'
  | 'amf'
  | 'cnmv'
  | 'fma_at';

export interface AffectedLegislation {
  name: string;
  celex?: string;
  eli?: string;
}

export interface Attachment {
  url: string;
  title?: string;
  mime_type?: string;
  /** Size in bytes, when the source declares one (RSS enclosures do). */
  length?: number;
}

/**
 * Lifecycle state of an event that has a response window.
 *
 * Derived from `response_deadline` against the reader's clock, not frozen into
 * prose at fetch time — a consultation that was open when it was scraped is not
 * open forever.
 */
export type RegEventStatus = 'open' | 'closed' | 'unknown';

export interface RegEvent {
  /**
   * Opaque versioned URN: `urn:regevent:v2:<regulator>:<ref>`.
   * See `src/ids.ts` for how `<ref>` is derived and why the scheme is versioned.
   */
  id: string;
  type: RegEventType;
  regulator: RegulatorId;
  jurisdiction: string;
  title: string;
  title_lang: string;
  summary: string | null;
  url: string;
  published: string;
  effective_date: string | null;
  response_deadline: string | null;
  affected_legislation: AffectedLegislation[];
  tags: string[];
  attachments: Attachment[];
  /** Response state for consultation-shaped events; `unknown` when there is no deadline. */
  status: RegEventStatus;
  /** When this pipeline retrieved the item, as opposed to when the source says it was published. */
  retrieved_at: string;
  /** Fingerprint of title + summary + canonical URL + published date; changes when the source edits the text. */
  content_hash: string;
}

export interface AggregatorResult {
  regulator: RegulatorId;
  events: RegEvent[];
  fetched_at: string;
  errors: string[];
}

export interface BaseAggregator {
  readonly id: RegulatorId;
  readonly name: string;
  readonly jurisdiction: string;
  readonly url: string;
  fetch(): Promise<AggregatorResult>;
}
