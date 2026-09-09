import { XMLParser } from 'fast-xml-parser';
import type {
  BaseAggregator,
  RegulatorId,
  AggregatorResult,
  RegEvent,
  RegEventType,
  RegEventStatus,
  AffectedLegislation,
  Attachment,
} from '../types.js';
import { makeEventId, contentHash } from '../ids.js';
import { PACKAGE_VERSION } from '../version.js';

/** Fields an aggregator supplies; the rest are filled in by `buildEvent`. */
export interface EventInput {
  /** Source-derived reference; see `src/ids.ts`. */
  ref: string;
  type: RegEventType;
  title: string;
  url: string;
  published: string;
  title_lang?: string;
  summary?: string | null;
  effective_date?: string | null;
  response_deadline?: string | null;
  affected_legislation?: AffectedLegislation[];
  tags?: string[];
  attachments?: Attachment[];
}

/** One parsed RSS item, normalised across the small differences between feeds. */
export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  guid: string;
  description: string | null;
  enclosures: Attachment[];
}

export abstract class Aggregator implements BaseAggregator {
  abstract readonly id: RegulatorId;
  abstract readonly name: string;
  abstract readonly jurisdiction: string;
  abstract readonly url: string;

  protected readonly userAgent = `eu-reg-feed/${PACKAGE_VERSION} (+https://github.com/julianlaycock/eu-reg-feed)`;
  protected readonly defaultDelay = 2000; // ms between requests — respectful scraping
  protected readonly timeoutMs = 20_000;
  protected readonly maxAttempts = 3;

  /**
   * When the current run started retrieving from this source. Set once per
   * `fetch()` so every event in a run carries the same retrieval timestamp,
   * and defaults to "now" for direct `parse()` calls in tests.
   */
  protected retrievedAt = new Date().toISOString();

  async fetch(): Promise<AggregatorResult> {
    const start = new Date().toISOString();
    this.retrievedAt = start;
    const errors: string[] = [];
    let events: RegEvent[] = [];

    try {
      events = await this.scrape();
    } catch (err) {
      errors.push(`${this.id}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return {
      regulator: this.id,
      events,
      fetched_at: start,
      errors,
    };
  }

  protected abstract scrape(): Promise<RegEvent[]>;

  /**
   * Fetch a URL with a bounded timeout and one retry per transient failure.
   *
   * Permanent failures (4xx other than 408/429) fail immediately: retrying a
   * 404 just makes a broken scraper slower to report itself.
   */
  protected async fetchPage(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await globalThis.fetch(url, {
          headers: { 'User-Agent': this.userAgent },
          signal: controller.signal,
        });

        if (res.ok) return await res.text();

        const permanent = res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429;
        lastError = new Error(`HTTP ${res.status} fetching ${url}`);
        if (permanent) throw lastError;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (error === lastError) throw error; // permanent, already classified
        lastError = error.name === 'AbortError'
          ? new Error(`Timed out after ${this.timeoutMs}ms fetching ${url}`)
          : error;
      } finally {
        clearTimeout(timer);
      }

      if (attempt < this.maxAttempts) await this.delay(500 * 2 ** (attempt - 1));
    }

    throw lastError ?? new Error(`Failed to fetch ${url}`);
  }

  /**
   * Parse an RSS 2.0 document into normalised items.
   *
   * Shared here so that adding an RSS-based regulator is "map the fields",
   * not "re-derive the XMLParser options and the channel/item walk".
   */
  protected parseRSSItems(xml: string): RSSItem[] {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item;
    if (!items) return [];

    const entries = Array.isArray(items) ? items : [items];

    return entries.map((item: Record<string, unknown>) => {
      const link = String(item.link ?? '').trim();
      const guidNode = item.guid as { '#text'?: unknown } | string | undefined;
      const guid = typeof guidNode === 'object' && guidNode !== null
        ? String(guidNode['#text'] ?? link)
        : String(guidNode ?? link);
      const description = item['content:encoded'] ?? item.description ?? null;

      return {
        title: String(item.title ?? '').trim(),
        link,
        pubDate: String(item.pubDate ?? '').trim(),
        guid,
        description: typeof description === 'string' && description.length > 0 ? description : null,
        enclosures: this.parseEnclosures(item),
      };
    });
  }

  /** RSS `<enclosure>` elements, which regulators use for attached PDFs. */
  private parseEnclosures(item: Record<string, unknown>): Attachment[] {
    const raw = item.enclosure;
    if (!raw) return [];

    const list = Array.isArray(raw) ? raw : [raw];
    const attachments: Attachment[] = [];

    for (const entry of list) {
      const url = String((entry as Record<string, unknown>)['@_url'] ?? '').trim();
      if (!url) continue;
      const mime = (entry as Record<string, unknown>)['@_type'];
      const length = Number((entry as Record<string, unknown>)['@_length']);
      attachments.push({
        url,
        ...(mime ? { mime_type: String(mime) } : {}),
        ...(Number.isFinite(length) && length > 0 ? { length } : {}),
      });
    }

    return attachments;
  }

  /**
   * Build a complete RegEvent from the fields an aggregator knows about.
   *
   * Centralising this is what keeps identifiers, status and content hashing
   * consistent across sources — an aggregator cannot forget to set them.
   */
  protected buildEvent(input: EventInput): RegEvent {
    const summary = input.summary ?? null;
    const responseDeadline = input.response_deadline ?? null;

    return {
      id: makeEventId(this.id, input.ref),
      type: input.type,
      regulator: this.id,
      jurisdiction: this.jurisdiction,
      title: input.title,
      title_lang: input.title_lang ?? 'en',
      summary,
      url: input.url,
      published: input.published,
      effective_date: input.effective_date ?? null,
      response_deadline: responseDeadline,
      affected_legislation: input.affected_legislation ?? [],
      tags: input.tags ?? [],
      attachments: input.attachments ?? [],
      status: deriveStatus(responseDeadline),
      retrieved_at: this.retrievedAt,
      content_hash: contentHash({
        title: input.title,
        summary,
        url: input.url,
        published: input.published,
      }),
    };
  }

  protected delay(ms?: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms ?? this.defaultDelay));
  }
}

/**
 * Response state implied by a deadline.
 *
 * Kept as a pure function of the record so a consumer can recompute it at read
 * time instead of trusting a value frozen when the page was scraped.
 */
export function deriveStatus(responseDeadline: string | null, now = new Date()): RegEventStatus {
  if (!responseDeadline) return 'unknown';
  const deadline = new Date(responseDeadline);
  if (Number.isNaN(deadline.getTime())) return 'unknown';
  // A deadline day is inclusive: a consultation closing today is still open today.
  const endOfDeadlineDay = new Date(deadline);
  endOfDeadlineDay.setUTCHours(23, 59, 59, 999);
  return endOfDeadlineDay.getTime() >= now.getTime() ? 'open' : 'closed';
}
