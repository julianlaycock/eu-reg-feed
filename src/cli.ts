#!/usr/bin/env node

/**
 * eu-reg-feed CLI
 * 
 * Usage:
 *   eu-reg-feed fetch          Fetch all sources, output JSON
 *   eu-reg-feed fetch --pretty Pretty-print JSON output
 *   eu-reg-feed fetch --source esma  Fetch single source
 */

import { fetchAll, createAggregators } from './index.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'fetch';

  if (command === 'fetch') {
    const pretty = args.includes('--pretty');
    const sourceFlag = args.indexOf('--source');
    const sourceId = sourceFlag !== -1 ? args[sourceFlag + 1] : null;

    const results = await fetchAll();
    const filtered = sourceId
      ? results.filter(r => r.regulator === sourceId)
      : results;

    const allEvents = filtered.flatMap(r => r.events);
    const allErrors = filtered.flatMap(r => r.errors);

    const output = {
      schema: 'https://raw.githubusercontent.com/julianlaycock/eu-reg-feed/main/schema/regevent.schema.json',
      version: '0.1.0',
      generated_at: new Date().toISOString(),
      total_events: allEvents.length,
      total_errors: allErrors.length,
      sources: filtered.map(r => ({
        regulator: r.regulator,
        events: r.events.length,
        errors: r.errors,
        fetched_at: r.fetched_at,
      })),
      events: allEvents.sort((a, b) =>
        new Date(b.published).getTime() - new Date(a.published).getTime()
      ),
    };

    console.log(JSON.stringify(output, null, pretty ? 2 : undefined));
  } else {
    console.error(`Unknown command: ${command}`);
    console.error('Usage: eu-reg-feed fetch [--pretty] [--source <id>]');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
