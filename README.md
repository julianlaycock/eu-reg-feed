# eu-reg-feed

**Open standard and reference implementation for machine-readable EU regulatory change feeds.**

[![CI](https://github.com/julianlaycock/eu-reg-feed/actions/workflows/ci.yml/badge.svg)](https://github.com/julianlaycock/eu-reg-feed/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

## The Problem

EU regulators publish consultations, guidelines, final rules, and deadlines across dozens of websites — each in a different format, language, and structure. Where machine-readable output exists at all, it is a news feed rather than a regulatory one: ESMA's RSS (`https://www.esma.europa.eu/rss.xml`) carries the ten most recent press items with no consultation list, no response deadlines and no legislative references, which is why the consultations page is parsed instead. BaFin's conventional RSS paths return 404. Most National Competent Authorities (NCAs) publish only as unstructured HTML or PDF, and none publishes stable identifiers for the events themselves.

*Endpoint behaviour above verified 2026-09-09; see [`.github/workflows/canary.yml`](.github/workflows/canary.yml) for the scheduled job that re-checks the sources.*

The only way to track EU regulatory changes programmatically today is through commercial vendors charging **€25K–500K/year** (CUBE, Thomson Reuters Regulatory Intelligence, Wolters Kluwer OneSumX). Small fund managers, fintechs, and researchers are locked out.

## The Solution

eu-reg-feed provides two things:

1. **RegEvent JSON Schema** — an open standard defining a common format for regulatory change events (consultations, final rules, guidelines, transpositions, deadlines, warnings)

2. **Reference aggregators** — scrapers and parsers for EU regulators that normalize publications into the RegEvent format

### Currently supported sources

| Regulator | Jurisdiction | Method | Status |
|-----------|-------------|--------|--------|
| ESMA | EU | HTML scraping (consultations; RSS covers news only) | ✅ Working |
| EBA | EU | Native RSS | ✅ Working |
| CSSF | Luxembourg | Native RSS | ✅ Working |
| EIOPA | EU | Planned | 🔜 |
| EUR-Lex | EU | CELLAR/SPARQL | 🔜 |
| BaFin | Germany | HTML scraping | 🔜 |
| AMF | France | Planned | 🔜 |
| CNMV | Spain | Planned | 🔜 |
| FMA | Austria | Planned | 🔜 |

## Live Feed — no install needed

A GitHub Action fetches all sources daily and commits the result to
[`feed/latest.json`](feed/latest.json). Consume it directly:

```bash
curl -s https://raw.githubusercontent.com/julianlaycock/eu-reg-feed/main/feed/latest.json | jq '.events[0]'
```

The same daily run publishes two derived views of those events, so no JSON
handling is needed at all:

| View | URL | For |
|---|---|---|
| [`feed/latest.ics`](feed/latest.ics) | `https://raw.githubusercontent.com/julianlaycock/eu-reg-feed/main/feed/latest.ics` | Subscribing to response deadlines in Outlook, Google Calendar or Thunderbird |
| [`feed/latest.atom`](feed/latest.atom) | `https://raw.githubusercontent.com/julianlaycock/eu-reg-feed/main/feed/latest.atom` | Any feed reader |

Both are rendered from the JSON of the same run, so all three always describe
the same events.

## Quick Start

```bash
git clone https://github.com/julianlaycock/eu-reg-feed.git
cd eu-reg-feed
npm install
npm run build
npm start -- fetch --pretty
```

> npm package publication is planned — tracked in [#8](https://github.com/julianlaycock/eu-reg-feed/issues/8). Until then, use a local clone.

## Output Format

All events conform to the [RegEvent JSON Schema](schema/regevent.schema.json):

```json
{
  "id": "urn:regevent:v2:esma:consultation-reporting-framework-under-emir-clea-5343b289",
  "type": "consultation",
  "regulator": "esma",
  "jurisdiction": "EU",
  "title": "Consultation on the reporting framework under EMIR for clearing activity at recognised third-country CCPs",
  "title_lang": "en",
  "summary": null,
  "url": "https://www.esma.europa.eu/press-news/consultations/consultation-reporting-framework-under-emir-clearing-activity-recognised",
  "published": "2026-08-18T00:00:00.000Z",
  "effective_date": null,
  "response_deadline": "2026-10-12",
  "affected_legislation": [{ "name": "EMIR (Regulation (EU) No 648/2012)" }],
  "tags": [],
  "attachments": [],
  "status": "open",
  "retrieved_at": "2026-09-09T08:41:03.376Z",
  "content_hash": "5ec8d5bc5585111c"
}
```

See [`examples/sample-output.json`](examples/sample-output.json) for a full multi-source output.

### Identifiers

`id` is an opaque, versioned URN: `urn:regevent:v2:<regulator>:<ref>`. The `v2`
segment is the *identifier scheme* version, separate from the schema version, so
a future change to how refs are derived is visible to consumers instead of
silently re-identifying the same publication.

The ref is the source system's own key where the regulator exposes one
(`node-19966` for EBA's Drupal, `p-128470` for CSSF's WordPress), otherwise a
slug of the canonical URL — hash-suffixed when it is long enough that truncation
could collide. Treat it as opaque; parse the URN, not the ref.

Two further fields make change detection possible without diffing whole records:

- `content_hash` — fingerprint of title, summary, canonical URL and publication
  date. It changes when a regulator edits a publication in place.
- `status` — `open` / `closed` / `unknown`, derived from `response_deadline` at
  retrieval time. Response state is never baked into the summary text, which
  would go stale the moment the window closed.

## CLI

```bash
npm start -- fetch --pretty                  # JSON feed for every source
npm start -- fetch --source esma             # one regulator only
npm start -- fetch --format ics > cal.ics    # response deadlines as a calendar
npm start -- fetch --format atom             # Atom 1.0, for any feed reader
npm start -- fetch --archive                 # also merge the run into archive/
npm start -- export --format ics             # re-render a saved feed, no fetching
npm start -- version
```

`export` reads a feed document that already exists (`feed/latest.json` by
default) and re-renders it as `ics` or `atom`. That is how the daily job
publishes three formats while hitting each regulator once: fetching per format
would triple the load on public websites for the same day's data.

The `.ics` export drops into Outlook, Google Calendar or Thunderbird without any
JSON handling: every consultation with a response deadline becomes an all-day
event on its closing date.

`fetch` exits **1** when a source failed or two events collided on one id, so a
degraded run fails CI instead of quietly publishing a short feed. The document is
still written first, so the partial result can be inspected — and published.

## Archive

`feed/latest.json` is a snapshot of what the regulators are showing today;
anything that scrolls off their front pages disappears from it. `--archive`
maintains the durable copy in `archive/<regulator>/<year>.json`:

- new events are appended, never overwritten;
- an event whose `content_hash` changed keeps its old title and summary in a
  `revisions[]` entry, so an edit by the regulator is recorded rather than lost;
- `first_seen` records the run that first saw the publication;
- a file is only rewritten when something actually changed, so a quiet day
  produces no diff at all.

## Use as a Library

```typescript
import { CSSFAggregator, ESMAAggregator, fetchAll } from 'eu-reg-feed';

// Fetch from all sources
const results = await fetchAll();
for (const result of results) {
  console.log(`${result.regulator}: ${result.events.length} events`);
}

// Or fetch from a single source
const cssf = new CSSFAggregator();
const result = await cssf.fetch();
console.log(result.events);
```

## Adding a New NCA

eu-reg-feed is designed to be extended. To add a new regulator:

1. Create a new file in `src/aggregators/` extending the `Aggregator` base class
2. Implement `scrape()`; use the inherited `fetchPage()` (retries, timeout and
   User-Agent) and, for an RSS source, `parseRSSItems()`
3. Build each event with `buildEvent()` — it derives the id, `status`,
   `retrieved_at` and `content_hash` so every source identifies events the same way
4. Add a fixture under `tests/fixtures/` and a test that calls
   `assertValidRegEvents()` from [`tests/conformance.ts`](tests/conformance.ts):
   one call validates the whole batch against the published JSON Schema and
   checks that ids are unique and belong to their regulator
5. Register in `src/index.ts`

See [`src/aggregators/cssf.ts`](src/aggregators/cssf.ts) for the simplest example (RSS-based) or [`src/aggregators/esma.ts`](src/aggregators/esma.ts) for HTML scraping.

## RegEvent Schema

The full JSON Schema is at [`schema/regevent.schema.json`](schema/regevent.schema.json).

### Event Types

| Type | Description |
|------|-------------|
| `consultation` | Open or closed public consultation |
| `final_rule` | Final rule, regulation, or standard |
| `guidance` | Supervisory guidance or circular |
| `guideline` | Formal guideline (comply-or-explain) |
| `opinion` | Regulatory opinion |
| `qa_update` | Q&A document update |
| `transposition` | National transposition of EU directive |
| `deadline` | Regulatory deadline or filing date |
| `warning` | Investor warning or fraud alert |
| `speech` | Speech or public statement |
| `report` | Report, study, or communiqué |
| `delegated_act` | EU delegated act |
| `implementing_technical_standard` | ITS publication |
| `regulatory_technical_standard` | RTS publication |

## Development

```bash
npm install
npm run build
npm run lint
npm test          # 96 tests across 12 suites; builds first
```

`npm test` includes the schema conformance suite: every event in the committed
feed and in `examples/` is validated against
[`schema/regevent.schema.json`](schema/regevent.schema.json) with ajv, so a
schema change that breaks published data fails CI. Tests that hit live regulator
endpoints are opt-in and live in `tests/live/` (`npm run test:live`); a
[weekly canary](.github/workflows/canary.yml) runs them against the real sources
so a source changing shape is caught before it silently empties the feed.

[CONTRIBUTING.md](CONTRIBUTING.md) covers adding a regulator and the change
process for the schema itself.

## MCP Server

[`mcp-server/`](mcp-server/) is an [MCP](https://modelcontextprotocol.io)
server that exposes the feed to MCP clients (Claude Desktop, Claude Code, or
any other agent that speaks the protocol) as four tools: `search_events`,
`get_event`, `list_upcoming_deadlines`, `list_sources`, plus a resource
serving the RegEvent JSON Schema. It reads either a local checkout's
`feed/latest.json` or the published feed over HTTPS, whichever is configured.
See [`mcp-server/README.md`](mcp-server/README.md) for the quick start, tool
reference, and design notes.

## Companion Project

eu-reg-feed is the monitoring counterpart to [**open-annex-iv**](https://github.com/julianlaycock/open-annex-iv), an open-source AIFMD Annex IV XML serialization library.

Together they form a complete open-source regulatory data layer:
- **open-annex-iv** → data OUT to regulators (XML filing generation)
- **eu-reg-feed** → data IN from regulators (change monitoring)

## Generative AI

Parts of this codebase are written with an AI coding assistant, under review by
the maintainer. What is assisted, what is not, and how each session is logged is
documented in [AI-USE.md](AI-USE.md), with per-session records in
[`docs/ai-provenance/`](docs/ai-provenance/).

## License

Apache 2.0 — see [LICENSE](LICENSE).

## Author

Julian Laycock — [julian.laycock@caelith.tech](mailto:julian.laycock@caelith.tech)
