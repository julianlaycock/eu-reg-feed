import {
  ID_SCHEME_VERSION,
  canonicalUrl,
  contentHash,
  eventRef,
  makeEventId,
  nativeRef,
  shortHash,
  slugify,
  urlRef,
} from '../src/ids.js';

describe('canonicalUrl', () => {
  it('normalises scheme, host and trailing slash', () => {
    expect(canonicalUrl('http://WWW.Eba.Europa.EU/node/19966/')).toBe(
      'https://eba.europa.eu/node/19966'
    );
  });

  it('drops fragments and tracking parameters but keeps real ones', () => {
    expect(canonicalUrl('https://www.cssf.lu/?p=128470&utm_source=rss#top')).toBe(
      'https://cssf.lu/?p=128470'
    );
  });

  it('returns the input unchanged when it is not a URL', () => {
    expect(canonicalUrl('  not a url  ')).toBe('not a url');
  });
});

describe('slugify', () => {
  it('strips accents and punctuation', () => {
    expect(slugify('Communiqué de presse — n°42')).toBe('communique-de-presse-n-42');
  });

  it('returns an empty string when nothing survives', () => {
    expect(slugify('///')).toBe('');
  });
});

describe('nativeRef', () => {
  it('reads the Drupal node id out of an EBA guid', () => {
    expect(nativeRef('19966 at https://www.eba.europa.eu')).toBe('node-19966');
  });

  it('reads the node id out of a /node/ URL', () => {
    expect(nativeRef('https://www.esma.europa.eu/node/5343')).toBe('node-5343');
  });

  it('reads the WordPress post id out of a CSSF guid', () => {
    expect(nativeRef('https://www.cssf.lu/?p=128470')).toBe('p-128470');
  });

  it('returns null when there is no recognisable key', () => {
    expect(nativeRef('https://www.cssf.lu/en/2026/09/some-warning/')).toBeNull();
    expect(nativeRef('')).toBeNull();
  });
});

describe('urlRef', () => {
  it('uses the last path segment as a readable slug', () => {
    expect(urlRef('https://www.cssf.lu/en/2026/09/warning-capman/')).toBe('warning-capman');
  });

  it('appends a hash of the full URL when the slug is long enough to truncate', () => {
    const long =
      'https://www.esma.europa.eu/press-news/consultations/consultation-on-the-reporting-framework-under-emir-for-clearing-members';
    const ref = urlRef(long);
    expect(ref).toMatch(/^[a-z0-9-]+-[0-9a-f]{8}$/);
    expect(ref.length).toBeLessThanOrEqual(57);
  });

  /**
   * Two publications whose slugs share the first 48 characters must still get
   * different refs — silent truncation without a hash is what produced the v1
   * collisions.
   */
  it('keeps refs distinct when long slugs share a prefix', () => {
    const prefix = 'https://www.esma.europa.eu/consultations/';
    const shared = 'consultation-on-the-reporting-framework-under-emir-part-';
    expect(urlRef(`${prefix}${shared}one`)).not.toBe(urlRef(`${prefix}${shared}two`));
  });

  it('falls back to a pure hash when there is no usable segment', () => {
    expect(urlRef('https://www.eba.europa.eu/')).toMatch(/^u-[0-9a-f]{16}$/);
  });
});

describe('eventRef', () => {
  it('prefers the source system key over the URL slug', () => {
    expect(
      eventRef({ guid: '19966 at https://www.eba.europa.eu', url: 'https://www.eba.europa.eu/some-title' })
    ).toBe('node-19966');
  });

  it('falls back to the URL when the guid carries no key', () => {
    expect(eventRef({ guid: 'urn:uuid:not-a-key', url: 'https://www.cssf.lu/en/2026/09/warning-capman/' })).toBe(
      'warning-capman'
    );
  });

  /**
   * The v1 bug in one assertion: nine EBA guids differing only in their leading
   * node number must produce nine distinct refs.
   */
  it('distinguishes guids that differ only in the leading node number', () => {
    const guids = [19966, 19963, 19960, 19955, 19950, 19947, 19940, 19938, 19931].map(
      n => `${n} at https://www.eba.europa.eu`
    );
    const refs = guids.map(guid => eventRef({ guid, url: 'https://www.eba.europa.eu/rss.xml' }));
    expect(new Set(refs).size).toBe(guids.length);
  });
});

describe('makeEventId', () => {
  it('embeds the scheme version so a future change is visible to consumers', () => {
    expect(makeEventId('eba', 'node-19966')).toBe(`urn:regevent:${ID_SCHEME_VERSION}:eba:node-19966`);
    expect(ID_SCHEME_VERSION).toBe('v2');
  });
});

describe('contentHash', () => {
  const parts = {
    title: 'Consultation on draft RTS',
    summary: 'Some summary',
    url: 'https://www.eba.europa.eu/node/19966',
    published: '2026-09-01T00:00:00.000Z',
  };

  it('is a stable 16-character hex digest', () => {
    expect(contentHash(parts)).toMatch(/^[0-9a-f]{16}$/);
    expect(contentHash(parts)).toBe(contentHash({ ...parts }));
  });

  it('ignores cosmetic URL differences', () => {
    expect(contentHash({ ...parts, url: 'http://www.eba.europa.eu/node/19966/' })).toBe(
      contentHash(parts)
    );
  });

  it('changes when the source edits the text', () => {
    expect(contentHash({ ...parts, title: 'Consultation on draft RTS (updated)' })).not.toBe(
      contentHash(parts)
    );
  });
});

describe('shortHash', () => {
  it('honours the requested length', () => {
    expect(shortHash('x', 8)).toHaveLength(8);
    expect(shortHash('x')).toHaveLength(16);
  });
});
