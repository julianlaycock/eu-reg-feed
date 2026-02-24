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
      expect.arrayContaining(['id', 'type', 'regulator', 'title', 'published', 'url'])
    );
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
