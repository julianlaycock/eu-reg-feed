# Use of generative AI in this project

This project uses a generative AI coding assistant. This file states where, how,
and with what safeguards, so that anyone reading the code — or funding it — can
judge the work on an informed basis.

It follows the [NLnet Foundation policy on generative
AI](https://nlnet.nl/foundation/policies/generativeAI/).

## Summary

| Question | Answer |
|---|---|
| Is generative AI used to produce code in this repository? | Yes. |
| Which model? | Anthropic Claude (Opus 5), via the Claude Code CLI. |
| Which parts? | See "Scope" below; the identifier scheme, exports, archive and test suite of release 0.2.0 were written with AI assistance. |
| Who is accountable for the result? | Julian Laycock, the maintainer. Every line is reviewed and tested before it is committed. |
| How is it disclosed? | Per commit (a `Co-Authored-By` trailer), and per session in [`docs/ai-provenance/`](docs/ai-provenance/). |
| Is anything unreviewed AI output submitted for payment? | No. |

## Scope

### What the maintainer owns

Every engineering decision in this project is the maintainer's. That is not a
courtesy formula; it is the specific list below, and it is what the assistant is
never given authority over:

- what the project is for, and which regulators it supports;
- the RegEvent schema: its field set, its semantics, and what a conforming
  document means;
- the identifier scheme and its versioning rules, which form a contract with
  every consumer of the feed;
- what counts as a breaking change, and how it is signalled (see the schema
  change process in [CONTRIBUTING.md](CONTRIBUTING.md));
- the testing strategy, and what has to pass before anything merges;
- dependency and licence selection, and therefore the supply chain;
- failure behaviour: what the tool does when a source is unreachable or changes
  shape;
- how the standard is governed, and where stewardship goes next.

The problem, the constraints and the acceptance criteria are fixed before a
prompt is written. The maintainer decides what merges.

### What the assistant does

Implementation against a specification that already exists: refactoring, writing
test code, drafting documentation, and fixing defects the maintainer has
diagnosed. It has no decision-making authority. Where it proposes an approach,
that proposal is not a decision until the maintainer has evaluated it, tested it
and accepted it. What the tool provides is execution speed, not judgement.

Nothing is committed that the maintainer could not have written and cannot
explain.

Specific to release 0.2.0 (the audit-hardening branch, September 2026):

- **Written with assistance**: the implementation of the v2 identifier scheme
  (`src/ids.ts`), the feed assembly and collision reporting (`src/feed.ts`), the
  archive writer (`src/archive.ts`), the ICS/Atom exports (`src/exports.ts`), the
  legislation citation matcher (`src/legislation.ts`), the rewritten aggregator
  base class, and the test suite under `tests/`.
- **Decided by the maintainer**: everything in the list above, including the
  identifier scheme's requirements and versioning rules that `src/ids.ts`
  implements; the diagnosis that the v1 scheme was collapsing distinct EBA
  publications onto one id; the decision to report collisions as errors rather
  than deduplicate them away; and every claim made in this repository's
  documentation about what regulators publish.

## Safeguards

1. **Licence hygiene.** The project is Apache-2.0 and depends only on
   FLOSS-licensed packages. No proprietary code is pasted into the repository,
   and no AI-generated content is committed that the maintainer could not have
   written and cannot explain.
2. **No misrepresentation.** Nothing generated is presented as human-written
   work. Commits carrying AI-assisted changes are marked as such.
3. **Quality accountability.** AI output is treated as a draft. It is read line
   by line, and it must pass `npm run lint` and `npm test` — including the schema
   conformance suite, which validates every event in the committed feed against
   `schema/regevent.schema.json` — before it is merged.
4. **Facts are verified, not generated.** Claims about regulator endpoints in the
   README are checked against the live endpoints and dated, because a language
   model will produce a plausible URL as readily as a real one. The
   `canary.yml` workflow re-checks the sources on a schedule.
5. **No unreviewed output is billed.** Time is claimed for specification, review,
   correction, testing and integration — the work actually done — never for
   generation.

## Provenance log

[`docs/ai-provenance/`](docs/ai-provenance/) holds one entry per assisted
session: the model, the dates and times, the instructions given, and what came
back. Commits from an assisted session carry a `Co-Authored-By` trailer and a
link to the session, so a reader can go from any line of code to the record of
how it was produced.

## Questions

Open an issue, or write to julian.laycock@caelith.tech.
