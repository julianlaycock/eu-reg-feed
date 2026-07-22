# eu-reg-feed

**Open standard and reference implementation for machine-readable EU regulatory change feeds.**

[![CI](https://github.com/julianlaycock/eu-reg-feed/actions/workflows/ci.yml/badge.svg)](https://github.com/julianlaycock/eu-reg-feed/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

## The Problem

EU regulators publish consultations, guidelines, final rules, and deadlines across dozens of websites — each in a different format, language, and structure. ESMA has **no RSS feed and no API**. BaFin's listed RSS URLs **return 404**. Most National Competent Authorities (NCAs) publish only as unstructured HTML or PDF.

The only way to track EU regulatory changes programmatically today is through commercial vendors charging **€25K–500K/year** (CUBE, Thomson Reuters Regulatory Intelligence, Wolters Kluwer OneSumX). Small fund managers, fintechs, and researchers are locked out.

## The Solution

eu-reg-feed provides two things:

1. **RegEvent JSON Schema** — an open standard defining a common format for regulatory change events (consultations, final rules, guidelines, transpositions, deadlines, warnings)

2. **Reference aggregators** — scrapers and parsers for EU regulators that normalize publications into the RegEvent format

### Currently supported sources

| Regulator | Jurisdiction | Method | Status |
|-----------|-------------|--------|--------|
| ESMA | EU | HTML scraping | ✅ Working |
| CSSF | Luxembourg | Native RSS | ✅ Working |
| EBA | EU | Planned | 🔜 |
| EIOPA | EU | Planned | 🔜 |
| EUR-Lex | EU | CELLAR/SPARQL | 🔜 |
| BaFin | Germany | HTML scraping | 🔜 |
| AMF | France | Planned | 🔜 |
| CNMV | Spain | Planned | 🔜 |
| FMA | Austria | Planned | 🔜 |

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
  "id": "urn:regevent:cssf:2026:warning-capman",
  "type": "warning",
  "regulator": "cssf",
  "jurisdiction": "LU",
  "title": "Warning concerning the website www.capman-holding.com",
  "title_lang": "en",
  "summary": null,
  "url": "https://www.cssf.lu/en/2026/02/warning-concerning-the-website-www-capman-holding-com/",
  "published": "2026-02-24T14:06:21.000Z",
  "effective_date": null,
  "response_deadline": null,
  "affected_legislation": [],
  "tags": ["investor-protection"],
  "attachments": []
}
```

See [`examples/sample-output.json`](examples/sample-output.json) for a full multi-source output.

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
2. Implement the `scrape()` method to fetch and parse the regulator's publications
3. Map output to `RegEvent` types
4. Add tests in `tests/`
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

## Companion Project

eu-reg-feed is the monitoring counterpart to [**open-annex-iv**](https://github.com/julianlaycock/open-annex-iv), an open-source AIFMD Annex IV XML serialization library.

Together they form a complete open-source regulatory data layer:
- **open-annex-iv** → data OUT to regulators (XML filing generation)
- **eu-reg-feed** → data IN from regulators (change monitoring)

## License

Apache 2.0 — see [LICENSE](LICENSE).

## Author

Julian Laycock — [julian.laycock@caelith.tech](mailto:julian.laycock@caelith.tech)
