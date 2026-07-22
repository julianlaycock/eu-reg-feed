import { EBAAggregator } from '../../src/aggregators/eba.js';

/** Live integration test — hits eba.europa.eu. Run via: npm run test:live */
describe('EBAAggregator (live)', () => {
  it('fetches and parses the live EBA RSS feed', async () => {
    const result = await new EBAAggregator().fetch();
    expect(result.regulator).toBe('eba');
    expect(result.errors).toHaveLength(0);
    expect(result.events.length).toBeGreaterThan(0);
  }, 30000);
});
