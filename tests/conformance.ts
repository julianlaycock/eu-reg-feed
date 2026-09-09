/**
 * Conformance kit.
 *
 * Every aggregator's output is checked against the published JSON Schema by the
 * same helper, so "does this new source emit valid RegEvents?" is one import
 * rather than a hand-copied list of assertions per test file.
 *
 * Any new aggregator should call `assertValidRegEvents` on its fixture output.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import ajvFormats from 'ajv-formats';
import type { RegEvent } from '../src/types.js';

export const SCHEMA_PATH = resolve(process.cwd(), 'schema', 'regevent.schema.json');

export function loadSchema(): Record<string, unknown> {
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
}

// ajv and ajv-formats ship CommonJS; under ESM the callable lands on either the
// module namespace or its `default`, depending on the interop path.
type Interop<T> = T & { default?: T };
const Ajv2020 = ((ajv2020 as Interop<typeof ajv2020>).default ?? ajv2020) as typeof ajv2020;
const addFormats = ((ajvFormats as Interop<typeof ajvFormats>).default ??
  ajvFormats) as typeof ajvFormats;

let cached: ValidateFunction | null = null;

/** Compiled validator for the published RegEvent schema. */
export function regEventValidator(): ValidateFunction {
  if (cached) return cached;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  cached = ajv.compile(loadSchema());
  return cached;
}

/** Throw with a readable message unless `event` validates against the schema. */
export function assertValidRegEvent(event: unknown): void {
  const validate = regEventValidator();
  if (validate(event)) return;

  const id = (event as { id?: string })?.id ?? '<no id>';
  const errors = (validate.errors ?? [])
    .map(err => `  ${err.instancePath || '/'} ${err.message}`)
    .join('\n');
  throw new Error(`RegEvent ${id} does not conform to the schema:\n${errors}`);
}

/**
 * Validate a batch and assert the invariants a feed must hold beyond the
 * schema: ids are unique, and each id belongs to the regulator that emitted it.
 *
 * The uniqueness check is the regression guard for the v1 identifier bug, where
 * nine distinct EBA publications shared one id and eight of them vanished from
 * any consumer keyed on `id`.
 */
export function assertValidRegEvents(events: RegEvent[]): void {
  for (const event of events) assertValidRegEvent(event);

  const seen = new Map<string, string>();
  for (const event of events) {
    const previous = seen.get(event.id);
    if (previous && previous !== event.url) {
      throw new Error(`Duplicate id ${event.id} used by two publications: ${previous} and ${event.url}`);
    }
    seen.set(event.id, event.url);
    if (!event.id.startsWith(`urn:regevent:v2:${event.regulator}:`)) {
      throw new Error(`Event id ${event.id} does not match its regulator ${event.regulator}`);
    }
  }
}
