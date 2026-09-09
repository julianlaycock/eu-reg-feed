#!/usr/bin/env node

/**
 * eu-reg-feed CLI
 *
 * Usage:
 *   eu-reg-feed fetch                     Fetch all sources, print the JSON feed
 *   eu-reg-feed fetch --pretty            Pretty-print the JSON
 *   eu-reg-feed fetch --source esma       Fetch a single source
 *   eu-reg-feed fetch --format ics|atom   Emit deadlines as iCalendar, or Atom
 *   eu-reg-feed fetch --archive [dir]     Also merge the run into the archive
 *   eu-reg-feed export --format ics       Re-render a saved feed as iCalendar
 *   eu-reg-feed export --format atom      Re-render a saved feed as Atom
 *   eu-reg-feed version                   Print the version
 *
 * Exit code 1 means the run was degraded — a source failed, or ids collided.
 * The output document is still written first, so a caller can inspect it.
 */

import { readFile } from 'node:fs/promises';

import { fetchAll } from './index.js';
import { buildFeed } from './feed.js';
import { updateArchive, DEFAULT_ARCHIVE_DIR } from './archive.js';
import { toAtom, toICS } from './exports.js';
import { PACKAGE_VERSION } from './version.js';
import type { RegEvent } from './types.js';

const USAGE = [
  'Usage: eu-reg-feed fetch [--pretty] [--source <id>] [--format json|ics|atom] [--archive [dir]]',
  '       eu-reg-feed export [--from <feed.json>] [--format ics|atom]',
  '       eu-reg-feed version',
].join('\n');

const DEFAULT_FEED_PATH = 'feed/latest.json';

/** Value of `--flag value`, or null when the flag is absent or has no value. */
function flagValue(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : null;
}

async function runFetch(args: string[]): Promise<number> {
  const pretty = args.includes('--pretty');
  const source = flagValue(args, '--source');
  const format = flagValue(args, '--format') ?? 'json';

  if (!['json', 'ics', 'atom'].includes(format)) {
    console.error(`Unknown format: ${format}`);
    console.error(USAGE);
    return 1;
  }

  const results = await fetchAll({ source });

  if (source && results.length === 0) {
    console.error(`Unknown source: ${source}`);
    return 1;
  }

  const { document, collisions } = buildFeed(results);

  for (const collision of collisions) console.error(collision);

  if (format === 'ics') {
    process.stdout.write(toICS(document.events));
  } else if (format === 'atom') {
    process.stdout.write(toAtom(document.events));
  } else {
    console.log(JSON.stringify(document, null, pretty ? 2 : undefined));
  }

  if (args.includes('--archive')) {
    const dir = flagValue(args, '--archive') ?? DEFAULT_ARCHIVE_DIR;
    const updates = await updateArchive(document.events, { dir });
    for (const update of updates) {
      console.error(
        `  archive ${update.path}: +${update.added} new, ${update.revised} revised, ${update.total} total`
      );
    }
  }

  // A degraded run must not look like a clean one to CI.
  return document.total_errors > 0 ? 1 : 0;
}

/**
 * Re-render a feed document that is already on disk.
 *
 * The daily job needs the same run's events in three formats. Fetching three
 * times would hit every regulator three times for one day's data, which is not
 * a reasonable thing to do to a public body's website, so the JSON written by
 * `fetch` is the input here and no network call is made.
 */
async function runExport(args: string[]): Promise<number> {
  const from = flagValue(args, '--from') ?? DEFAULT_FEED_PATH;
  const format = flagValue(args, '--format') ?? 'ics';

  if (!['ics', 'atom'].includes(format)) {
    console.error(`Unknown format: ${format}`);
    console.error(USAGE);
    return 1;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(from, 'utf8'));
  } catch (err) {
    console.error(`Cannot read feed document: ${from} (${(err as Error).message})`);
    return 1;
  }

  const events = (parsed as { events?: unknown }).events;
  if (!Array.isArray(events)) {
    console.error(`Not a feed document (no events array): ${from}`);
    return 1;
  }

  process.stdout.write(
    format === 'ics' ? toICS(events as RegEvent[]) : toAtom(events as RegEvent[])
  );
  return 0;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'fetch';

  if (command === 'fetch') {
    process.exitCode = await runFetch(args);
    return;
  }

  if (command === 'export') {
    process.exitCode = await runExport(args);
    return;
  }

  if (command === 'version' || command === '--version') {
    console.log(PACKAGE_VERSION);
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error(USAGE);
  process.exitCode = 1;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
