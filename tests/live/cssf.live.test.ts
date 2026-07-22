import { CSSFAggregator } from '../../src/aggregators/cssf.js';

/** Live integration test — hits cssf.lu. Run via: npm run test:live */
describe('CSSFAggregator (live)', () => {
  it('fetches and parses the live CSSF RSS feed', async () => {
    const result = await new CSSFAggregator().fetch();
    expect(result.regulator).toBe('cssf');
    expect(result.errors).toHaveLength(0);
    expect(result.events.length).toBeGreaterThan(0);
  }, 30000);
});
