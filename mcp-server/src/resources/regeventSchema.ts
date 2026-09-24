/**
 * Exposes `schema/regevent.schema.json` as an MCP resource, so a client can
 * read the normative RegEvent JSON Schema without an out-of-band fetch.
 *
 * Same local-then-remote fallback as the feed: try the sibling checkout
 * first, then the published raw URL. Read fresh each time rather than
 * cached, since it is a small, rarely-read file, and staleness on a schema
 * document is a worse failure mode than an extra read.
 */

import { readFile } from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FeedConfig } from '../config.js';

const RESOURCE_URI = 'eu-reg-feed://schema/regevent';

async function loadSchemaText(config: FeedConfig): Promise<string> {
  try {
    return await readFile(config.schemaLocalPath, 'utf-8');
  } catch {
    const response = await fetch(config.schemaRemoteUrl);
    if (!response.ok) {
      throw new Error(
        `Could not read the RegEvent schema locally (${config.schemaLocalPath}) or remotely ` +
          `(${config.schemaRemoteUrl}: HTTP ${response.status})`
      );
    }
    return await response.text();
  }
}

export function registerRegEventSchemaResource(server: McpServer, config: FeedConfig): void {
  server.registerResource(
    'regevent-schema',
    RESOURCE_URI,
    {
      title: 'RegEvent JSON Schema',
      description:
        'The Apache-2.0 RegEvent JSON Schema (draft 2020-12) that every event in the feed conforms to.',
      mimeType: 'application/schema+json',
    },
    async uri => {
      const text = await loadSchemaText(config);
      return {
        contents: [{ uri: uri.href, mimeType: 'application/schema+json', text }],
      };
    }
  );
}
