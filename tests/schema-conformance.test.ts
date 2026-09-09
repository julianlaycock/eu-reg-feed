/**
 * The schema is the product: anything published under the RegEvent name has to
 * validate against it. This checks the artefacts the repository actually ships
 * — the daily feed and the documented example — not just freshly parsed
 * fixtures, so a drift between code and published data fails CI.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertValidRegEvents, regEventValidator } from './conformance.js';
import { makeEvent } from './factory.js';
import type { RegEvent } from '../src/types.js';

interface PublishedDocument {
  schema: string;
  total_events: number;
  events: RegEvent[];
}

function readJSON(relativePath: string): PublishedDocument {
  return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), 'utf-8')) as PublishedDocument;
}

describe('published artefacts', () => {
  const artefacts = ['feed/latest.json', 'examples/sample-output.json'];

  for (const artefact of artefacts) {
    it(`${artefact} conforms to the schema`, () => {
      expect(existsSync(resolve(process.cwd(), artefact))).toBe(true);
      const document = readJSON(artefact);

      expect(typeof document.schema).toBe('string');
      expect(Array.isArray(document.events)).toBe(true);
      expect(document.total_events).toBe(document.events.length);

      assertValidRegEvents(document.events);
    });
  }
});

describe('schema enforcement', () => {
  const validate = regEventValidator();

  it('accepts a well-formed event', () => {
    expect(validate(makeEvent())).toBe(true);
  });

  it('rejects an event missing a required field', () => {
    const { content_hash: _omitted, ...incomplete } = makeEvent();
    expect(validate(incomplete)).toBe(false);
  });

  it('rejects an unknown property', () => {
    expect(validate({ ...makeEvent(), unexpected: true })).toBe(false);
  });

  it('rejects a scheme v1 identifier and other malformed ids', () => {
    // v1 ids had no scheme segment at all: urn:regevent:<regulator>:<year>:<ref>
    expect(validate({ ...makeEvent(), id: 'urn:regevent:eba:2026:webaeuropaeu' })).toBe(false);
    expect(validate({ ...makeEvent(), id: 'node-19966' })).toBe(false);
    expect(validate({ ...makeEvent(), id: 'urn:regevent:v2:eba:has spaces' })).toBe(false);
  });

  it('rejects an out-of-range status, regulator or type', () => {
    expect(validate({ ...makeEvent(), status: 'pending' })).toBe(false);
    expect(validate({ ...makeEvent(), regulator: 'fca' })).toBe(false);
    expect(validate({ ...makeEvent(), type: 'press_release' })).toBe(false);
  });

  it('rejects a content hash that is not 16 hex characters', () => {
    expect(validate({ ...makeEvent(), content_hash: 'not-a-hash' })).toBe(false);
  });
});
