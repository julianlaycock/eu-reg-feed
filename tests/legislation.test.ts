import { extractLegislation } from '../src/legislation.js';

describe('extractLegislation', () => {
  it('recognises the post-2015 citation style', () => {
    expect(extractLegislation('Draft RTS under Regulation (EU) 2019/2088')).toEqual([
      { name: 'Regulation (EU) 2019/2088' },
    ]);
  });

  it('recognises the "No" and pre-2015 styles', () => {
    const names = extractLegislation(
      'Amending Regulation (EU) No 575/2013 and Directive 2014/65/EU'
    ).map(l => l.name);
    expect(names).toContain('Regulation (EU) No 575/2013');
    expect(names).toContain('Directive 2014/65/EU');
  });

  it('recognises the short names regulators actually use', () => {
    const names = extractLegislation('Guidelines on MiFID II suitability and DORA reporting').map(
      l => l.name
    );
    expect(names).toContain('MiFID II (Directive 2014/65/EU)');
    expect(names).toContain('DORA (Regulation (EU) 2022/2554)');
  });

  /**
   * A wrong identifier is worse than an absent one: CELEX and ELI are only set
   * when resolved against EUR-Lex, which this module does not do.
   */
  it('never guesses a CELEX number or ELI URI', () => {
    for (const ref of extractLegislation('Regulation (EU) 2019/2088 and MiCA')) {
      expect(ref.celex).toBeUndefined();
      expect(ref.eli).toBeUndefined();
    }
  });

  it('deduplicates repeated references', () => {
    const refs = extractLegislation('EMIR review: EMIR reporting under EMIR');
    expect(refs).toHaveLength(1);
  });

  it('caps the number of references returned', () => {
    const text = 'MiFID II MiFIR AIFMD UCITS EMIR DORA MiCA SFDR';
    expect(extractLegislation(text).length).toBeLessThanOrEqual(5);
    expect(extractLegislation(text, 2)).toHaveLength(2);
  });

  it('returns an empty list for text with no citation, or no text at all', () => {
    expect(extractLegislation('EBA publishes its annual report')).toEqual([]);
    expect(extractLegislation(null)).toEqual([]);
    expect(extractLegislation(undefined)).toEqual([]);
    expect(extractLegislation('')).toEqual([]);
  });
});
