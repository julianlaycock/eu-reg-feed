# Contributing to eu-reg-feed

Contributions are welcome — the most valuable one is an aggregator for a
regulator not yet covered. The EU has 27 member states; the open issues
track the ones on the roadmap.

## Adding a new regulator

1. Check the [open issues](https://github.com/julianlaycock/eu-reg-feed/issues)
   for the regulator (or open one) so work isn't duplicated.
2. Create `src/aggregators/<id>.ts` extending the `Aggregator` base class.
   - RSS available → copy the pattern in [`src/aggregators/eba.ts`](src/aggregators/eba.ts)
   - HTML scraping needed → copy [`src/aggregators/esma.ts`](src/aggregators/esma.ts)
3. Implement `parse(content: string): RegEvent[]` (pure, testable) and
   `scrape()` (fetch + parse). Map fields to the
   [RegEvent schema](schema/regevent.schema.json).
4. Save a snapshot of the real feed/page under `tests/fixtures/` and add
   a fixture-based unit test (`tests/<id>.test.ts`) plus an opt-in live
   test (`tests/live/<id>.live.test.ts`).
5. Register the aggregator in `src/index.ts` and add a row to the
   README source table.

## Ground rules

- **Respectful scraping.** Regulator sites are public infrastructure:
  identify with the project User-Agent (see `Aggregator.userAgent`),
  keep polling intervals conservative, honour robots.txt.
- **Preserve original language.** Do not machine-translate titles or
  summaries — tag them with the correct `title_lang` instead.
- **Offline tests.** CI must pass without network access; anything that
  hits a live endpoint belongs in `tests/live/`.
- `npm run build && npm test` must be green before you open a PR.

## Schema changes

The RegEvent schema is the project's public contract. Additive changes
(new optional fields, new enum values) are fine in a minor version;
breaking changes need a discussion issue first.
