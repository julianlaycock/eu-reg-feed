#!/usr/bin/env node

/**
 * eu-reg-feed MCP server: stdio entry point.
 *
 * Reads its configuration from the environment (see `config.ts`), wires up
 * the tools and resource in `server.ts`, and speaks MCP over stdio, which is
 * what Claude Desktop and Claude Code both expect for a locally-run server.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error('eu-reg-feed-mcp fatal error:', err);
  process.exit(1);
});
