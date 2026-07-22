import { ESMAAggregator } from '../../src/aggregators/esma.js';

/** Live integration test — hits esma.europa.eu. Run via: npm run test:live */
describe('ESMAAggregator (live)', () => {
  it('fetches and parses the live ESMA consultations page', async () => {
    const result = await new ESMAAggregator().fetch();
    expect(result.regulator).toBe('esma');
    expect(result.errors).toHaveLength(0);
    expect(result.events.length).toBeGreaterThan(0);
  }, 30000);
});
