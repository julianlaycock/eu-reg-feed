import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FeedCache } from '../feedSource.js';
import { feedErrorResult } from '../errors.js';
import { searchEvents, MAX_SEARCH_LIMIT } from '../logic.js';
import { RegEventTypeSchema, RegulatorIdSchema } from '../schema.js';

export function registerSearchEvents(server: McpServer, cache: FeedCache): void {
  server.registerTool(
    'search_events',
    {
      title: 'Search regulatory events',
      description:
        'Search RegEvents in the eu-reg-feed feed by regulator, event type, a keyword ' +
        '(matched against title and summary), and/or a publication date range. All filters ' +
        'are optional and combine with AND. Returns the newest-first matches, capped at `limit`.',
      inputSchema: {
        regulator: RegulatorIdSchema.optional().describe(
          'Restrict to one regulator, e.g. "esma", "eba", "cssf".'
        ),
        type: RegEventTypeSchema.optional().describe(
          'Restrict to one event type, e.g. "consultation", "final_rule", "warning".'
        ),
        keyword: z.string().optional().describe('Case-insensitive substring match on title + summary.'),
        dateFrom: z.string().optional().describe('ISO 8601 date/time; matches on the event\'s `published` date, inclusive.'),
        dateTo: z.string().optional().describe('ISO 8601 date/time; matches on the event\'s `published` date, inclusive.'),
        limit: z
          .number()
          .int()
          .positive()
          .max(MAX_SEARCH_LIMIT)
          .optional()
          .describe(`Maximum results to return (default 20, max ${MAX_SEARCH_LIMIT}).`),
      },
    },
    async ({ regulator, type, keyword, dateFrom, dateTo, limit }) => {
      const result = await cache.get();
      if (result.status !== 'ok') return feedErrorResult(result);

      const events = searchEvents(result.document, { regulator, type, keyword, dateFrom, dateTo, limit });

      return {
        content: [
          {
            type: 'text',
            text:
              events.length === 0
                ? 'No events matched.'
                : `${events.length} event(s):\n` +
                  events.map(e => `- [${e.regulator}] ${e.published.slice(0, 10)} ${e.title} (${e.id})`).join('\n'),
          },
        ],
        structuredContent: { events, count: events.length },
      };
    }
  );
}
