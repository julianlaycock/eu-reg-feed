import { Aggregator } from './base.js';
import type { RegEvent, RegulatorId } from '../types.js';
import { eventRef } from '../ids.js';
import { extractLegislation } from '../legislation.js';

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
    return this.parse(xml);
  }

  /** Parse a CSSF RSS 2.0 document into RegEvents. Exposed for fixture-based testing. */
  parse(xml: string): RegEvent[] {
    const events: RegEvent[] = [];

    for (const item of this.parseRSSItems(xml)) {
      // One malformed item must not discard the items already parsed: an
      // unparseable date used to throw out of the whole source for that run.
      if (!item.title || !item.link || !item.pubDate) continue;

      const publishedDate = new Date(item.pubDate);
      if (Number.isNaN(publishedDate.getTime())) continue;

      const summary = item.description;

      events.push(this.buildEvent({
        ref: eventRef({ guid: item.guid, url: item.link }),
        type: this.classifyEvent(item.title),
        title: item.title,
        summary,
        url: item.link,
        published: publishedDate.toISOString(),
        affected_legislation: extractLegislation(`${item.title} ${summary ?? ''}`),
        tags: this.extractTags(item.title),
        attachments: item.enclosures,
      }));
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
