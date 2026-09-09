/**
 * CLI contract tests.
 *
 * These run the built `dist/cli.js` the way a consumer or the daily Action
 * would, and cover only paths that need no network: the exit codes and the
 * argument handling. Live fetching is covered by tests/live/.
 *
 * `npm test` builds first (see the pretest script), so dist is current.
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { PACKAGE_VERSION } from '../src/version.js';

const execFileAsync = promisify(execFile);
const CLI = resolve(process.cwd(), 'dist', 'cli.js');

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function run(...args: string[]): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [CLI, ...args]);
    return { code: 0, stdout, stderr };
  } catch (err) {
    const failure = err as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
}

describe('eu-reg-feed CLI', () => {
  it('is built before the tests run', () => {
    expect(existsSync(CLI)).toBe(true);
  });

  it('prints the package version', async () => {
    const result = await run('version');
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(PACKAGE_VERSION);
  });

  it('exits non-zero on an unknown command, with usage', async () => {
    const result = await run('frobnicate');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Unknown command: frobnicate');
    expect(result.stderr).toContain('Usage:');
  });

  it('exits non-zero on an unknown source without touching the network', async () => {
    const result = await run('fetch', '--source', 'no-such-regulator');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Unknown source: no-such-regulator');
  });

  it('exits non-zero on an unknown output format', async () => {
    const result = await run('fetch', '--format', 'yaml');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Unknown format: yaml');
  });
});

/**
 * `export` re-renders the published feed without fetching, which is what lets
 * the daily job publish JSON, iCalendar and Atom from a single pass over the
 * regulators instead of three.
 */
describe('eu-reg-feed export', () => {
  const FEED = resolve(process.cwd(), 'feed', 'latest.json');

  it('renders the published feed as iCalendar', async () => {
    const result = await run('export', '--from', FEED, '--format', 'ics');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('BEGIN:VCALENDAR');
    expect(result.stdout).toContain('END:VCALENDAR');
  });

  it('renders the published feed as Atom', async () => {
    const result = await run('export', '--from', FEED, '--format', 'atom');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
  });

  it('exits non-zero when the feed document is missing', async () => {
    const result = await run('export', '--from', 'no-such-feed.json');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Cannot read feed document');
  });

  it('exits non-zero when the file is not a feed document', async () => {
    const result = await run('export', '--from', resolve(process.cwd(), 'package.json'));
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('no events array');
  });

  it('exits non-zero on an unknown export format', async () => {
    const result = await run('export', '--from', FEED, '--format', 'yaml');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Unknown format: yaml');
  });
});
