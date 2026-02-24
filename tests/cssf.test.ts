import { CSSFAggregator } from '../src/aggregators/cssf.js';

describe('CSSFAggregator', () => {
  const agg = new CSSFAggregator();

  it('has correct metadata', () => {
    expect(agg.id).toBe('cssf');
    expect(agg.jurisdiction).toBe('LU');
    expect(agg.url).toBe('https://www.cssf.lu/en/feed/');
  });

  it('fetches live CSSF RSS feed', async () => {
    const result = await agg.fetch();
    expect(result.regulator).toBe('cssf');
    expect(result.errors).toHaveLength(0);
    expect(result.events.length).toBeGreaterThan(0);

    // Validate first event structure
    const event = result.events[0];
    expect(event.id).toMatch(/^urn:regevent:cssf:/);
    expect(event.regulator).toBe('cssf');
    expect(event.jurisdiction).toBe('LU');
    expect(event.title).toBeTruthy();
    expect(event.url).toMatch(/^https:\/\/www\.cssf\.lu/);
    expect(event.published).toBeTruthy();
    expect(event.title_lang).toBe('en');
  }, 15000);

  it('classifies warnings correctly', async () => {
    const result = await agg.fetch();
    const warnings = result.events.filter(e => e.type === 'warning');
    for (const w of warnings) {
      expect(w.title.toLowerCase()).toContain('warning');
    }
  }, 15000);
});
