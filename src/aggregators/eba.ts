import { XMLParser } from 'fast-xml-parser';
import { Aggregator } from './base.js';
import type { RegEvent, RegulatorId } from '../types.js';

/**
 * EBA (European Banking Authority) Aggregator
 *
 * EBA publishes a working RSS 2.0 feed covering news, consultations,
 * guidelines, and technical standards.
 * Feed: https://www.eba.europa.eu/rss.xml
 *
 * Item descriptions are raw Drupal markup (not real summaries), so
 * summary is left null rather than shipping noise.
 */
export class EBAAggregator extends Aggregator {
  readonly id: RegulatorId = 'eba';
  readonly name = 'European Banking Authority';
  readonly jurisdiction = 'EU';
  readonly url = 'https://www.eba.europa.eu/rss.xml';

  protected async scrape(): Promise<RegEvent[]> {
    const xml = await this.fetchPage(this.url);
    return this.parse(xml);
  }

  /** Parse an EBA RSS 2.0 document into RegEvents. Exposed for fixture-based testing. */
  parse(xml: string): RegEvent[] {
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
      const title = String(item.title ?? '').trim();
      const link = String(item.link ?? '');
      const pubDate = item.pubDate ?? '';
      const guid = item.guid?.['#text'] ?? item.guid ?? link;

      if (!title || !link || !pubDate) continue;

      const publishedDate = new Date(pubDate);
      if (Number.isNaN(publishedDate.getTime())) continue;

      const seq = String(guid).replace(/[^a-zA-Z0-9]/g, '').slice(-12);

      events.push({
        id: this.makeId(publishedDate.getFullYear(), seq),
        type: this.classifyEvent(title),
        regulator: this.id,
        jurisdiction: this.jurisdiction,
        title,
        title_lang: 'en',
        summary: null,
        url: link,
        published: publishedDate.toISOString(),
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
    if (lower.includes('consult')) return 'consultation';
    if (lower.includes('final draft regulatory technical standard') || lower.includes(' rts ')) return 'regulatory_technical_standard';
    if (lower.includes('final draft implementing technical standard') || lower.includes(' its ')) return 'implementing_technical_standard';
    if (lower.includes('guidelines')) return 'guideline';
    if (lower.includes('opinion')) return 'opinion';
    if (lower.includes('q&a')) return 'qa_update';
    if (lower.includes('speech') || lower.includes('keynote')) return 'speech';
    if (lower.includes('report') || lower.includes('study') || lower.includes('dashboard')) return 'report';
    return 'guidance';
  }

  private extractTags(title: string): string[] {
    const tags: string[] = [];
    const lower = title.toLowerCase();
    if (lower.includes('aml') || lower.includes('money laundering')) tags.push('AML');
    if (lower.includes('dora') || lower.includes('ict risk')) tags.push('DORA');
    if (lower.includes('crr') || lower.includes('crd') || lower.includes('capital requirement')) tags.push('CRR-CRD');
    if (lower.includes('mica') || lower.includes('crypto')) tags.push('MiCA');
    if (lower.includes('psd') || lower.includes('payment')) tags.push('payments');
    if (lower.includes('stress test')) tags.push('stress-testing');
    if (lower.includes('market risk') || lower.includes('benchmarking')) tags.push('market-risk');
    return tags;
  }
}
