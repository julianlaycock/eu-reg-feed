import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FeedCache } from '../feedSource.js';
import { feedErrorResult } from '../errors.js';
import { getEvent } from '../logic.js';

export function registerGetEvent(server: McpServer, cache: FeedCache): void {
  server.registerTool(
    'get_event',
    {
      title: 'Get one regulatory event by id',
      description:
        'Fetch a single RegEvent by its full `id` URN, e.g. ' +
        '"urn:regevent:v2:esma:consultation-reporting-framework-under-emir-clea-5343b289". ' +
        'Use `search_events` first if the exact id is not already known.',
      inputSchema: {
        id: z.string().min(1).describe('The RegEvent `id` URN to look up.'),
      },
    },
    async ({ id }) => {
      const result = await cache.get();
      if (result.status !== 'ok') return feedErrorResult(result);

      const event = getEvent(result.document, id);
      if (!event) {
        return {
          isError: true,
          content: [{ type: 'text', text: `No event with id "${id}" in the current feed.` }],
        };
      }

      return {
        content: [{ type: 'text', text: `${event.title}\n${event.url}` }],
        structuredContent: { event },
      };
    }
  );
}
