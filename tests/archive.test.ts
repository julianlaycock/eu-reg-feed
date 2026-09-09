import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { updateArchive } from '../src/archive.js';
import type { ArchiveFile } from '../src/archive.js';
import { contentHash } from '../src/ids.js';
import { makeEvent } from './factory.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'eu-reg-feed-archive-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function readArchive(path: string): Promise<ArchiveFile> {
  return JSON.parse(await readFile(join(dir, path), 'utf8')) as ArchiveFile;
}

describe('updateArchive', () => {
  it('writes one file per regulator and year', async () => {
    const updates = await updateArchive(
      [
        makeEvent({ id: 'urn:regevent:v2:eba:node-1', published: '2026-09-01T00:00:00.000Z' }),
        makeEvent({ id: 'urn:regevent:v2:eba:node-2', published: '2025-12-30T00:00:00.000Z' }),
        makeEvent({
          id: 'urn:regevent:v2:cssf:p-3',
          regulator: 'cssf',
          published: '2026-09-02T00:00:00.000Z',
        }),
      ],
      { dir }
    );

    expect(updates.map(u => [u.regulator, u.year, u.added])).toEqual([
      ['cssf', 2026, 1],
      ['eba', 2025, 1],
      ['eba', 2026, 1],
    ]);

    const file = await readArchive(join('eba', '2026.json'));
    expect(file.regulator).toBe('eba');
    expect(file.year).toBe(2026);
    expect(file.events).toHaveLength(1);
    expect(file.events[0].first_seen).toBe(file.events[0].retrieved_at);
  });

  it('appends new events to an existing year without touching the old ones', async () => {
    const first = makeEvent({ id: 'urn:regevent:v2:eba:node-1' });
    await updateArchive([first], { dir });

    const second = makeEvent({
      id: 'urn:regevent:v2:eba:node-2',
      url: 'https://www.eba.europa.eu/node/2',
      published: '2026-09-05T00:00:00.000Z',
    });
    const [update] = await updateArchive([second], { dir });

    expect(update).toMatchObject({ added: 1, revised: 0, total: 2 });

    const file = await readArchive(join('eba', '2026.json'));
    // Newest first.
    expect(file.events.map(e => e.id)).toEqual([second.id, first.id]);
    expect(file.events[1].title).toBe(first.title);
    expect(file.events[1].revisions).toBeUndefined();
  });

  it('records a revision when the regulator edits a publication', async () => {
    const original = makeEvent({ id: 'urn:regevent:v2:eba:node-1', title: 'Consultation on draft RTS' });
    await updateArchive([original], { dir });

    const edited = {
      ...original,
      title: 'Consultation on draft RTS (corrected)',
      retrieved_at: '2026-09-10T06:17:00.000Z',
      content_hash: contentHash({
        title: 'Consultation on draft RTS (corrected)',
        summary: original.summary,
        url: original.url,
        published: original.published,
      }),
    };
    const [update] = await updateArchive([edited], { dir });

    expect(update).toMatchObject({ added: 0, revised: 1, total: 1 });

    const file = await readArchive(join('eba', '2026.json'));
    const archived = file.events[0];
    expect(archived.title).toBe('Consultation on draft RTS (corrected)');
    // first_seen still points at the run that first saw the publication.
    expect(archived.first_seen).toBe(original.retrieved_at);
    expect(archived.revisions).toHaveLength(1);
    expect(archived.revisions?.[0]).toMatchObject({
      title: 'Consultation on draft RTS',
      content_hash: original.content_hash,
      retrieved_at: original.retrieved_at,
    });
  });

  /**
   * The daily Action commits whatever the archive writer touches. Re-seeing the
   * same events must therefore leave the file byte-identical, or every quiet day
   * produces a diff and real changes get lost in timestamp noise.
   */
  it('leaves the file untouched when nothing changed', async () => {
    const event = makeEvent({ id: 'urn:regevent:v2:eba:node-1' });
    await updateArchive([event], { dir });
    const before = await readFile(join(dir, 'eba', '2026.json'), 'utf8');

    const [update] = await updateArchive([event], { dir });
    const after = await readFile(join(dir, 'eba', '2026.json'), 'utf8');

    expect(update).toMatchObject({ added: 0, revised: 0, total: 1 });
    expect(after).toBe(before);
  });

  it('files an event with an unparseable published date under its retrieval year', async () => {
    await updateArchive(
      [makeEvent({ id: 'urn:regevent:v2:eba:node-1', published: 'not a date' })],
      { dir }
    );

    const file = await readArchive(join('eba', '2026.json'));
    expect(file.events).toHaveLength(1);
  });
});
