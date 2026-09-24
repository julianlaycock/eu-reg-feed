# Changelog

Notable changes per release. Dates are the release date, in UTC.

## 0.3.0 (2026-09-24)

### Added: MCP server

`mcp-server/` is a Model Context Protocol server that exposes the RegEvent feed
to AI assistants such as Claude Desktop and Claude Code. It has four tools
(`search_events`, `get_event`, `list_upcoming_deadlines`, `list_sources`) and
one resource (`eu-reg-feed://schema/regevent`, the RegEvent JSON Schema). The
feed source is configurable: a local file or the published HTTPS feed, with a
TTL cache. See `mcp-server/README.md`.

The package has its own tooling (TypeScript, vitest, 33 tests). The root lint
and Jest configs now ignore `mcp-server/`. Root CI does not build or test it
yet.

## 0.2.0 (2026-09-09)

### Breaking: event identifiers change once

Every event id is re-derived. `urn:regevent:cssf:2026:ssflup128470` becomes
`urn:regevent:v2:cssf:p-128470`.

The v1 scheme built ids from the last characters of a source guid. EBA's guids
all end in the same tail, so nine of ten EBA publications collapsed onto one id
and were unreachable. Ids are now built from the source system's own key (the
Drupal node id, the WordPress post id), and a collision is reported as an error
instead of being deduplicated away.

Anyone storing ids from the 0.1.x feed has to re-key against the new feed once.
The scheme version now sits inside the URN so a consumer can detect this rather
than discover it, and the rule from here on is in CONTRIBUTING.md: ids are never
silently re-derived.

### Added

- `status`, `retrieved_at` and `content_hash` on every event. Response state is
  derived from the deadline at read time rather than frozen into the record.
- An append-only archive at `archive/<regulator>/<year>.json`. New events are
  appended, an edit by the regulator is kept as a `revisions[]` entry, and
  `first_seen` records the run that first saw a publication.
- `feed/latest.ics` and `feed/latest.atom`, published daily beside the JSON:
  response deadlines as a calendar to subscribe to, and every event as an Atom
  feed. `export --from <feed.json> --format ics|atom` re-renders a saved feed
  without fetching, so all three formats come from one pass over the regulators.
- `affected_legislation`: citations found in regulator text ("Regulation (EU)
  2019/2088", "MiFID II"). `celex` and `eli` are left unset rather than guessed;
  resolving them against EUR-Lex is future work.
- A published schema change process in CONTRIBUTING.md: a proposal backed by a
  real regulator publication, a 14-day comment period, and two independent
  implementations before it merges.
- AI-USE.md and `docs/ai-provenance/`, disclosing where a coding assistant was
  used, what the maintainer decides, and what each session did.
- SECURITY.md and CODE_OF_CONDUCT.md.
- Lint in CI, a weekly canary against the live regulator endpoints, and schema
  conformance over the published artefacts. 96 tests across 12 suites.

### Fixed

- A degraded run exits non-zero, so a source failing fails the job instead of
  quietly publishing a short feed. The partial feed is still written first.
- The daily job no longer commits when only run timestamps changed.
- The README described ESMA as having no RSS at all. It has one, carrying the
  ten most recent press items with no consultation list, no response deadlines
  and no legislative references, which is why the consultations page is parsed
  instead. Source behaviour in the README is now dated and re-checked weekly.

## 0.1.1 (2026-07-22)

Test suite made runnable offline by default; stdout kept clean for piped JSON.

## 0.1.0 (2026-02-24)

Initial release: the RegEvent schema, ESMA and CSSF aggregators, the CLI, and
the daily published feed. EBA followed.
