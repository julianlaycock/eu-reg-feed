/**
 * Append-only archive of everything the pipeline has ever seen.
 *
 * `feed/latest.json` is a snapshot of what the regulators are showing today —
 * anything that scrolls off their front pages disappears from it. The archive
 * is the durable copy: one file per regulator per year, merged rather than
 * overwritten, so the record of what was published (and when the wording of it
 * changed) survives.
 *
 * Layout:
 *   archive/<regulator>/<year>.json   { regulator, year, updated_at, events[] }
 *
 * One file per regulator-year keeps each file small enough to read whole and
 * each daily diff small (a handful of appended entries), without the
 * thousands-of-tiny-files problem of one file per event.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { RegEvent, RegulatorId } from './types.js';

export const DEFAULT_ARCHIVE_DIR = 'archive';

export interface ArchiveFile {
  regulator: RegulatorId;
  year: number;
  updated_at: string;
  events: ArchivedEvent[];
}

export interface ArchivedEvent extends RegEvent {
  /**
   * Retrieval timestamp of the first run that saw this event. `retrieved_at`
   * is the run that last saw it *change*, so the pair brackets the period over
   * which the record was stable.
   */
  first_seen: string;
  /**
   * Previous versions of the record, appended whenever the source edits the
   * text of a publication already archived. Newest first.
   */
  revisions?: ArchiveRevision[];
}

export interface ArchiveRevision {
  retrieved_at: string;
  content_hash: string;
  title: string;
  summary: string | null;
}

export interface ArchiveUpdate {
  path: string;
  regulator: RegulatorId;
  year: number;
  added: number;
  revised: number;
  total: number;
}

/** Year an event belongs to, from its published date (falling back to retrieval). */
function eventYear(event: RegEvent): number {
  const published = new Date(event.published);
  const date = Number.isNaN(published.getTime()) ? new Date(event.retrieved_at) : published;
  return date.getUTCFullYear();
}

function archivePath(dir: string, regulator: RegulatorId, year: number): string {
  return join(dir, regulator, `${year}.json`);
}

async function readArchiveFile(path: string): Promise<ArchiveFile | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as ArchiveFile;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Merge a run's events into the archive.
 *
 * A regulator-year file is only rewritten when something actually changed, so a
 * quiet day produces no diff at all.
 *
 * New ids are appended. A known id whose `content_hash` changed has its previous
 * title/summary pushed onto `revisions` before the record is updated, so an
 * edit by the regulator is recorded rather than silently overwritten.
 */
export async function updateArchive(
  events: RegEvent[],
  options: { dir?: string } = {}
): Promise<ArchiveUpdate[]> {
  const dir = options.dir ?? DEFAULT_ARCHIVE_DIR;

  // Group by regulator-year so each file is read, merged and written once.
  const groups = new Map<string, { regulator: RegulatorId; year: number; events: RegEvent[] }>();
  for (const event of events) {
    const year = eventYear(event);
    const key = `${event.regulator}:${year}`;
    const group = groups.get(key) ?? { regulator: event.regulator, year, events: [] };
    group.events.push(event);
    groups.set(key, group);
  }

  const updates: ArchiveUpdate[] = [];

  for (const group of [...groups.values()].sort((a, b) => (a.regulator + a.year).localeCompare(b.regulator + b.year))) {
    const path = archivePath(dir, group.regulator, group.year);
    const existing = await readArchiveFile(path);
    const byId = new Map<string, ArchivedEvent>((existing?.events ?? []).map(e => [e.id, e]));

    let added = 0;
    let revised = 0;

    for (const event of group.events) {
      const known = byId.get(event.id);

      if (!known) {
        byId.set(event.id, { ...event, first_seen: event.retrieved_at });
        added++;
        continue;
      }

      if (known.content_hash !== event.content_hash) {
        const revisions = known.revisions ?? [];
        revisions.unshift({
          retrieved_at: known.retrieved_at,
          content_hash: known.content_hash,
          title: known.title,
          summary: known.summary,
        });
        byId.set(event.id, { ...event, first_seen: known.first_seen, revisions });
        revised++;
        continue;
      }

      // Same content, already archived: leave the record untouched. Bumping a
      // "last seen" timestamp here would rewrite every archive file on every
      // run and bury real changes in timestamp noise.
    }

    if (added === 0 && revised === 0) {
      updates.push({ path, regulator: group.regulator, year: group.year, added: 0, revised: 0, total: byId.size });
      continue;
    }

    // Newest first, and stable for events sharing a timestamp so diffs stay small.
    const merged = [...byId.values()].sort((a, b) => {
      const delta = new Date(b.published).getTime() - new Date(a.published).getTime();
      return delta !== 0 ? delta : a.id.localeCompare(b.id);
    });

    const file: ArchiveFile = {
      regulator: group.regulator,
      year: group.year,
      updated_at: new Date().toISOString(),
      events: merged,
    };

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(file, null, 2)}\n`, 'utf8');

    updates.push({
      path,
      regulator: group.regulator,
      year: group.year,
      added,
      revised,
      total: merged.length,
    });
  }

  return updates;
}
