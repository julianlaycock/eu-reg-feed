/**
 * Zod mirror of eu-reg-feed's RegEvent and feed document shapes.
 *
 * This server treats the feed as data crossing a process boundary (a local
 * file, or an HTTP fetch of the published JSON), not as an internal library
 * import from `../src/types.ts`. That keeps the server buildable and testable
 * on its own, and lets it point at the public feed URL with no local checkout
 * of the parent project at all. `schema/regevent.schema.json` in the parent
 * repo remains the single normative definition; this file is kept in sync
 * with it by hand and the fixture feed in `tests/fixtures/` is checked against
 * both.
 */

import { z } from 'zod';

export const RegEventTypeSchema = z.enum([
  'consultation',
  'final_rule',
  'guidance',
  'guideline',
  'opinion',
  'qa_update',
  'transposition',
  'deadline',
  'warning',
  'speech',
  'report',
  'delegated_act',
  'implementing_technical_standard',
  'regulatory_technical_standard',
]);
export type RegEventType = z.infer<typeof RegEventTypeSchema>;

export const RegulatorIdSchema = z.enum([
  'esma',
  'eba',
  'eiopa',
  'eurlex',
  'bafin',
  'cssf',
  'amf',
  'cnmv',
  'fma_at',
]);
export type RegulatorId = z.infer<typeof RegulatorIdSchema>;

export const RegEventStatusSchema = z.enum(['open', 'closed', 'unknown']);

const AffectedLegislationSchema = z.object({
  name: z.string(),
  celex: z.string().optional(),
  eli: z.string().optional(),
});

const AttachmentSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  mime_type: z.string().optional(),
  length: z.number().optional(),
});

export const RegEventSchema = z.object({
  id: z.string(),
  type: RegEventTypeSchema,
  regulator: RegulatorIdSchema,
  jurisdiction: z.string(),
  title: z.string(),
  title_lang: z.string(),
  summary: z.string().nullable(),
  url: z.string(),
  published: z.string(),
  effective_date: z.string().nullable(),
  response_deadline: z.string().nullable(),
  affected_legislation: z.array(AffectedLegislationSchema),
  tags: z.array(z.string()),
  attachments: z.array(AttachmentSchema),
  status: RegEventStatusSchema,
  retrieved_at: z.string(),
  content_hash: z.string(),
});
export type RegEvent = z.infer<typeof RegEventSchema>;

const FeedSourceSchema = z.object({
  regulator: RegulatorIdSchema,
  events: z.number(),
  errors: z.array(z.string()),
  fetched_at: z.string(),
});

/**
 * Deliberately lenient at the top level (`.passthrough()`): the feed document
 * gains fields over time (see CHANGELOG.md in the parent repo), and this
 * server's job is to serve events, not to be a second conformance gate for the
 * parent project's own `test:schema` suite. Each event is still validated
 * strictly, because malformed events are exactly what would break the tools.
 */
export const FeedDocumentSchema = z
  .object({
    schema: z.string(),
    version: z.string(),
    generated_at: z.string(),
    total_events: z.number(),
    total_errors: z.number(),
    sources: z.array(FeedSourceSchema),
    events: z.array(RegEventSchema),
  })
  .passthrough();
export type FeedDocument = z.infer<typeof FeedDocumentSchema>;
