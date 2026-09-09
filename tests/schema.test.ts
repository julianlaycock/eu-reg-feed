import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('RegEvent JSON Schema', () => {
  const schemaPath = resolve(process.cwd(), 'schema', 'regevent.schema.json');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

  it('has required top-level fields', () => {
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.title).toBe('RegEvent');
    expect(schema.type).toBe('object');
  });

  it('defines all required properties', () => {
    expect(schema.required).toEqual(
      expect.arrayContaining([
        'id',
        'type',
        'regulator',
        'jurisdiction',
        'title',
        'published',
        'url',
        'status',
        'retrieved_at',
        'content_hash',
      ])
    );
  });

  it('pins the identifier scheme version in the id pattern', () => {
    const pattern = new RegExp(schema.properties.id.pattern);
    expect(pattern.test('urn:regevent:v2:eba:node-19966')).toBe(true);
    // Scheme v1 ids (no version segment) are no longer valid.
    expect(pattern.test('urn:regevent:eba:2026:webaeuropaeu')).toBe(false);
  });

  it('defines the response status enum', () => {
    expect(schema.properties.status.enum).toEqual(['open', 'closed', 'unknown']);
  });

  it('defines event type enum', () => {
    const types = schema.properties.type.enum;
    expect(types).toContain('consultation');
    expect(types).toContain('final_rule');
    expect(types).toContain('guidance');
    expect(types).toContain('warning');
    expect(types).toContain('transposition');
    expect(types).toContain('deadline');
  });

  it('defines regulator enum', () => {
    const regulators = schema.properties.regulator.enum;
    expect(regulators).toContain('esma');
    expect(regulators).toContain('eba');
    expect(regulators).toContain('eiopa');
    expect(regulators).toContain('bafin');
    expect(regulators).toContain('cssf');
  });

  it('disallows additional properties', () => {
    expect(schema.additionalProperties).toBe(false);
  });
});
