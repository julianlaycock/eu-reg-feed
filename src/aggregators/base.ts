import type { BaseAggregator, RegulatorId, AggregatorResult, RegEvent } from '../types.js';

export abstract class Aggregator implements BaseAggregator {
  abstract readonly id: RegulatorId;
  abstract readonly name: string;
  abstract readonly jurisdiction: string;
  abstract readonly url: string;

  protected readonly userAgent = 'eu-reg-feed/0.1.0 (+https://github.com/julianlaycock/eu-reg-feed)';
  protected readonly defaultDelay = 2000; // ms between requests — respectful scraping

  async fetch(): Promise<AggregatorResult> {
    const start = new Date().toISOString();
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

  protected async fetchPage(url: string): Promise<string> {
    const res = await globalThis.fetch(url, {
      headers: { 'User-Agent': this.userAgent },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${url}`);
    }
    return res.text();
  }

  protected makeId(year: number, seq: string): string {
    return `urn:regevent:${this.id}:${year}:${seq}`;
  }

  protected delay(ms?: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms ?? this.defaultDelay));
  }
}
