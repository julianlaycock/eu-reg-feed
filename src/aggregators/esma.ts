import { Aggregator } from './base.js';
import type { RegEvent, RegulatorId } from '../types.js';

/**
 * ESMA Aggregator
 * 
 * ESMA has NO RSS feed and NO API for consultations/publications.
 * We parse the HTML consultation list page.
 * URL: https://www.esma.europa.eu/press-news/consultations
 */
export class ESMAAggregator extends Aggregator {
  readonly id: RegulatorId = 'esma';
  readonly name = 'European Securities and Markets Authority';
  readonly jurisdiction = 'EU';
  readonly url = 'https://www.esma.europa.eu/press-news/consultations';

  protected async scrape(): Promise<RegEvent[]> {
    const html = await this.fetchPage(this.url);
    return this.parse(html);
  }

  /** Parse the ESMA consultations page HTML into RegEvents. Exposed for fixture-based testing. */
  parse(html: string): RegEvent[] {
    const events: RegEvent[] = [];
    
    // ESMA consultation page has a repeating pattern:
    // "From DD/MM/YYYY to DD/MM/YYYY" followed by consultation title link
    // Pattern: date range line → title with link → topic tags → response link
    const blocks = html.split(/From\s+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/g);

    for (let i = 1; i < blocks.length; i += 3) {
      const startDateStr = blocks[i];
      const endDateStr = blocks[i + 1];
      const content = blocks[i + 2];

      if (!startDateStr || !endDateStr || !content) continue;

      // Extract title and link
      const linkMatch = content.match(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/);
      if (!linkMatch) continue;

      const path = linkMatch[1];
      const title = linkMatch[2].trim();
      const url = path.startsWith('http') ? path : `https://www.esma.europa.eu${path}`;

      // Extract topic tags
      const tagSection = content.split('</a>')[1] ?? '';
      const topicMatch = tagSection.match(/^\s*([A-Za-z\s,&]+)/);
      const tags = topicMatch
        ? topicMatch[1].split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const published = this.parseEUDate(startDateStr);
      const responseDeadline = this.parseEUDate(endDateStr);
      const year = new Date(published).getFullYear();
      const seq = path.replace(/[^a-zA-Z0-9]/g, '').slice(-16);

      // Determine if consultation is open or closed
      const isOpen = new Date(responseDeadline) > new Date();
      const hasResponses = content.includes('SEE RESPONSES');

      events.push({
        id: this.makeId(year, seq),
        type: 'consultation',
        regulator: this.id,
        jurisdiction: this.jurisdiction,
        title,
        title_lang: 'en',
        summary: isOpen ? 'Open consultation — responses accepted' : hasResponses ? 'Closed — responses published' : 'Closed',
        url,
        published,
        effective_date: null,
        response_deadline: responseDeadline.split('T')[0],
        affected_legislation: [],
        tags,
        attachments: [],
      });
    }

    return events;
  }

  /** Parse DD/MM/YYYY → ISO 8601 */
  private parseEUDate(dateStr: string): string {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}T00:00:00Z`).toISOString();
  }
}
