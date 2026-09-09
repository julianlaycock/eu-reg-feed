# Security policy

## Reporting a vulnerability

Email julian.laycock@caelith.tech. Please do not open a public issue for a
security problem until it has been fixed.

Include what you found, how to reproduce it, and what an attacker could do with
it. You will get an acknowledgement within 72 hours and a fix or a plan within
14 days. This is a small project with one maintainer, so if you have not heard
back in 72 hours, send a reminder rather than assuming the report was ignored.

You are welcome to publish your findings once a fix is released, and you will be
credited in the release notes unless you ask not to be.

## What is in scope

- The published library and CLI, including anything reachable by parsing a
  regulator's response: a malicious or malformed feed should never lead to code
  execution, a path outside the archive directory, or an unbounded resource
  claim in a consuming application.
- The GitHub Actions workflows in `.github/workflows/`, which hold write
  permission on this repository.
- Dependency vulnerabilities that this project's code actually exposes.

## What is not

- The regulators' own websites and feeds. Report those to the regulator; if you
  tell us as well, it will be tracked as an issue here so consumers of the feed
  know the source is affected.
- The accuracy or completeness of any regulatory event. That is a data quality
  issue, not a security one, and belongs in a normal issue.

## Handling of data

The project fetches and republishes documents that regulators have already made
public. It stores no credentials, processes no personal data, and requires no
account, so a compromise of this repository would affect the integrity of the
published feed rather than the confidentiality of anyone's data. Integrity is
the thing worth protecting here: consumers may act on a response deadline in the
feed, so a wrong or planted date has real consequences.

## Verifying what you consume

Every event carries a `url` pointing at the regulator's own page, and a
`content_hash` and `retrieved_at` describing exactly what was retrieved and
when. If a published event ever disagrees with the regulator's page, treat the
regulator's page as authoritative and open an issue.
