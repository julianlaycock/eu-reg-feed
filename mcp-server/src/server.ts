import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig, type FeedConfig } from './config.js';
import { FeedCache } from './feedSource.js';
import { registerSearchEvents } from './tools/searchEvents.js';
import { registerGetEvent } from './tools/getEvent.js';
import { registerListUpcomingDeadlines } from './tools/listUpcomingDeadlines.js';
import { registerListSources } from './tools/listSources.js';
import { registerRegEventSchemaResource } from './resources/regeventSchema.js';
import { PACKAGE_VERSION } from './version.js';

/** Build a fully-wired McpServer. Exported so tests can register + call tools directly. */
export function createServer(config: FeedConfig = loadConfig()): McpServer {
  const server = new McpServer({ name: 'eu-reg-feed-mcp-server', version: PACKAGE_VERSION });
  const cache = new FeedCache(config);

  registerSearchEvents(server, cache);
  registerGetEvent(server, cache);
  registerListUpcomingDeadlines(server, cache);
  registerListSources(server, cache);
  registerRegEventSchemaResource(server, config);

  return server;
}
