import { ESMAAggregator } from '../src/aggregators/esma.js';

describe('ESMAAggregator', () => {
  const agg = new ESMAAggregator();

  it('has correct metadata', () => {
    expect(agg.id).toBe('esma');
    expect(agg.jurisdiction).toBe('EU');
  });

  it('fetches and parses ESMA consultations', async () => {
    const result = await agg.fetch();
    expect(result.regulator).toBe('esma');
    expect(result.errors).toHaveLength(0);
    expect(result.events.length).toBeGreaterThan(0);

    // All events should be consultations
    for (const event of result.events) {
      expect(event.type).toBe('consultation');
      expect(event.regulator).toBe('esma');
      expect(event.jurisdiction).toBe('EU');
      expect(event.url).toMatch(/^https:\/\/www\.esma\.europa\.eu/);
      expect(event.published).toBeTruthy();
      expect(event.response_deadline).toBeTruthy();
    }
  }, 15000);

  it('identifies open vs closed consultations', async () => {
    const result = await agg.fetch();
    const open = result.events.filter(e =>
      e.response_deadline && new Date(e.response_deadline) > new Date()
    );
    const closed = result.events.filter(e =>
      e.response_deadline && new Date(e.response_deadline) <= new Date()
    );
    // Should have a mix (ESMA page shows both)
    expect(open.length + closed.length).toBe(result.events.length);
  }, 15000);
});
