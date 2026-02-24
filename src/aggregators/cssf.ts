import { XMLParser } from 'fast-xml-parser';
import { Aggregator } from './base.js';
import type { RegEvent, RegulatorId } from '../types.js';

/**
 * CSSF (Luxembourg) Aggregator
 * 
 * CSSF is the ONLY EU NCA with a properly functioning RSS feed.
 * Feed: https://www.cssf.lu/en/feed/
 * Format: RSS 2.0, hourly updates
 */
export class CSSFAggregator extends Aggregator {
  readonly id: RegulatorId = 'cssf';
  readonly name = 'Commission de Surveillance du Secteur Financier';
  readonly jurisdiction = 'LU';
  readonly url = 'https://www.cssf.lu/en/feed/';

  protected async scrape(): Promise<RegEvent[]> {
    const xml = await this.fetchPage(this.url);
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item;

    if (!items) return [];

    const entries = Array.isArray(items) ? items : [items];
    const events: RegEvent[] = [];

    for (const item of entries) {
      const title = item.title ?? '';
      const link = item.link ?? '';
      const pubDate = item.pubDate ?? '';
      const guid = item.guid?.['#text'] ?? item.guid ?? link;
      const description = item['content:encoded'] ?? item.description ?? null;

      const type = this.classifyEvent(title);
      const published = new Date(pubDate).toISOString();
      const year = new Date(pubDate).getFullYear();
      const seq = String(guid).replace(/[^a-zA-Z0-9]/g, '').slice(-12);

      events.push({
        id: this.makeId(year, seq),
        type,
        regulator: this.id,
        jurisdiction: this.jurisdiction,
        title,
        title_lang: 'en',
        summary: typeof description === 'string' && description.length > 0 ? description : null,
        url: link,
        published,
        effective_date: null,
        response_deadline: null,
        affected_legislation: [],
        tags: this.extractTags(title),
        attachments: [],
      });
    }

    return events;
  }

  private classifyEvent(title: string): RegEvent['type'] {
    const lower = title.toLowerCase();
    if (lower.includes('warning')) return 'warning';
    if (lower.includes('consultation')) return 'consultation';
    if (lower.includes('regulation') || lower.includes('circular')) return 'guidance';
    if (lower.includes('communiqué') || lower.includes('communique')) return 'report';
    return 'guidance';
  }

  private extractTags(title: string): string[] {
    const tags: string[] = [];
    const lower = title.toLowerCase();
    if (lower.includes('ucits') || lower.includes('uci')) tags.push('UCITS');
    if (lower.includes('aifm') || lower.includes('aif')) tags.push('AIFMD');
    if (lower.includes('mifid')) tags.push('MiFID');
    if (lower.includes('aml') || lower.includes('money laundering')) tags.push('AML');
    if (lower.includes('warning')) tags.push('investor-protection');
    if (lower.includes('covered bond') || lower.includes('lettre de gage')) tags.push('covered-bonds');
    return tags;
  }
}
