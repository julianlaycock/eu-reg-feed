import { Aggregator } from './base.js';
import type { RegEvent, RegulatorId } from '../types.js';
import { eventRef } from '../ids.js';
import { extractLegislation } from '../legislation.js';

/**
 * EBA (European Banking Authority) Aggregator
 *
 * EBA publishes a working RSS 2.0 feed covering news, consultations,
 * guidelines, and technical standards.
 * Feed: https://www.eba.europa.eu/rss.xml
 *
 * Item descriptions are raw Drupal markup (not real summaries), so
 * summary is left null rather than shipping noise.
 *
 * EBA's guids are Drupal's `<node id> at <site url>` form, which is why the
 * identifier logic reads the node id rather than any part of the string tail.
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
    const events: RegEvent[] = [];

    for (const item of this.parseRSSItems(xml)) {
      if (!item.title || !item.link || !item.pubDate) continue;

      const publishedDate = new Date(item.pubDate);
      if (Number.isNaN(publishedDate.getTime())) continue;

      events.push(this.buildEvent({
        ref: eventRef({ guid: item.guid, url: item.link }),
        type: this.classifyEvent(item.title),
        title: item.title,
        summary: null,
        url: item.link,
        published: publishedDate.toISOString(),
        affected_legislation: extractLegislation(item.title),
        tags: this.extractTags(item.title),
        attachments: item.enclosures,
      }));
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
