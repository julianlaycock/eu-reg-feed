# AI provenance — 2026-09-09, audit hardening (release 0.2.0)

Recorded under the project's [AI use disclosure](../../AI-USE.md), following the
[NLnet policy on generative AI](https://nlnet.nl/foundation/policies/generativeAI/).

## Session

| | |
|---|---|
| Date | 2026-09-09 (Europe/London) |
| Model | Anthropic Claude Opus 5 (`claude-opus-5`) |
| Interface | Claude Code CLI, working directly in the repository |
| Branch | `feature/audit-hardening`, from `develop` |
| Operator | Julian Laycock (maintainer) |

## Instructions given

The maintainer's instructions, verbatim, in the order given:

1. > how would you propose we proceed?

   (Context: a code audit of the repository, and the second-round questions
   received from NLnet about the project.)

2. > set rate at 60, sell the standard qurestion well // ai yes, do it // fix
   > staleness and make a comprehensive review of the tool to improve it
   > dramatically // ask me any more questions to answer your questions

3. Answers to follow-up questions, deciding: publish the AI disclosure; move the
   schema to a public governance route; scope the rebuild to "everything the
   audit finds".

No other prompts directed the code. The assistant proposed the work items; the
maintainer approved the scope before implementation.

## What the assistant produced

Written with AI assistance and reviewed line by line before commit:

- `src/ids.ts` — the v2 identifier scheme (native source keys, canonical-URL
  slugs, hash suffixes) and `content_hash`.
- `src/feed.ts` — feed assembly, deduplication, id-collision reporting.
- `src/archive.ts` — the append-only archive with `first_seen` and `revisions[]`.
- `src/exports.ts` — iCalendar and Atom re-emission.
- `src/legislation.ts` — citation matching for EU legal acts.
- `src/aggregators/base.ts` and the three aggregators — retries, timeouts, shared
  RSS parsing, per-item error isolation.
- `src/cli.ts`, `src/version.ts`, `src/index.ts` — CLI flags, exit codes.
- The test suite under `tests/` (91 tests), `eslint.config.js`, the workflow
  changes, and the documentation edits in `README.md`.

## What the maintainer decided or corrected

- **The defect that motivated the release was found by inspection, not
  generation**: scheme v1 built ids from the *last* characters of the source
  guid, so every EBA guid ending in `at https://www.eba.europa.eu` produced the
  same id. Nine of ten EBA publications were unreachable by id. The fix, the
  scheme version segment, and the requirement that collisions be reported rather
  than deduplicated away were specified before any code was written.
- **An assistant claim was wrong and was corrected.** The assistant reported that
  the published feed was 44 days stale. It was not: the local clone was 22
  commits behind `origin/main`, and the daily Action had been running green. The
  claim was retracted before it reached any document. It is recorded here because
  a disclosure that omits the errors is not a disclosure.
- **Endpoint claims were verified against the live sources, not accepted as
  generated.** The README stated that ESMA has no RSS feed; `https://www.esma.europa.eu/rss.xml`
  returns 200 with 10 news items (checked 2026-09-09), so the README was
  corrected to state what that feed does and does not carry. BaFin's conventional
  RSS paths returned 404 on the same date, and the README now dates that claim.

## Verification before commit

- `npm run lint` — clean.
- `npm test` — 91 tests across 12 suites, all passing, including the schema
  conformance suite that validates every event in `feed/latest.json` and
  `examples/sample-output.json` against `schema/regevent.schema.json`.
- A live run of the CLI: 40 events from 3 sources, 40 distinct ids, 0 errors.

## Retention

The full session transcript is retained by the maintainer and can be provided to
a funder on request. It is not committed here because it also contains material
unrelated to this repository.
