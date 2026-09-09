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
3. Implement `scrape()` (fetch + parse), the one abstract member, and keep the
   parsing itself in a public `parse(content: string): RegEvent[]` so it can be
   tested against a fixture without touching the network. Build every event with the inherited
   `buildEvent()`: it derives the id, `status`, `retrieved_at` and
   `content_hash`, so all sources identify events the same way. Never
   construct an id by hand.
4. Save a snapshot of the real feed/page under `tests/fixtures/` and add
   a fixture-based unit test (`tests/<id>.test.ts`) plus an opt-in live
   test (`tests/live/<id>.live.test.ts`). The unit test must call
   `assertValidRegEvents()` from [`tests/conformance.ts`](tests/conformance.ts),
   which validates the batch against the published JSON Schema and checks
   that ids are unique and belong to their regulator.
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
- **Identifiers are opaque and stable.** A publication keeps its id for
  life. If the derivation rules ever have to change, the scheme version in
  the URN (`urn:regevent:v2:...`) is incremented so consumers can detect it
  — ids are never silently re-derived. See `src/ids.ts`.
- `npm run build && npm run lint && npm test` must be green before you open
  a PR. `npm test` includes the schema conformance suite, which validates
  every event in the committed feed and example against the schema.
- **AI-assisted contributions are welcome, and must be disclosed** in the PR
  description — see [AI-USE.md](AI-USE.md). You remain accountable for code
  you submit: if you cannot explain it, do not open the PR.

## Changing the RegEvent schema

The RegEvent schema is the project's public contract, and the point of the
project is that it is not one vendor's private format. Changes therefore go
through a written, public process rather than a maintainer's judgement call.

1. **Proposal.** Open an issue labelled `schema-change` describing the
   problem, the proposed field or enum value, and at least one real
   publication from a real regulator that needs it. Proposals that cannot
   point at live source data are not accepted.
2. **Reuse before invention.** Where an established EU vocabulary already
   covers the concept, the proposal must use it rather than mint a new term:
   ELI for legal act identifiers, EuroVoc for subject terms, DCAT-AP for
   dataset-level metadata. A new field needs an explicit reason why none of
   these fits.
3. **Comment period.** Proposals stay open for at least 14 days so that
   implementers and consumers can object.
4. **Two implementations.** A change is only merged once at least two
   independent implementations — this reference implementation plus one
   other consumer or producer — have shown it works on real data.
5. **Versioning.** Additive changes (new optional fields, new enum values)
   go in a minor version. Anything that could break an existing consumer —
   a new required field, a removed field, a narrowed type, a change to how
   ids are derived — is a major version, announced in the release notes,
   and in the case of ids also carries a new scheme version in the URN.

The maintainer's stated intent is to move stewardship of this schema out of
a single maintainer's repository and into a neutral venue (a W3C Community
Group, or SEMIC / Interoperable Europe), with more than one maintainer, once
there is a second independent implementation. Until then, this process is
the guarantee: every change is visible, reasoned in public, and reversible.
