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
}

export interface RegEvent {
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
