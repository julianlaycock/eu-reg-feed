import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FeedCache } from '../feedSource.js';
import { feedErrorResult } from '../errors.js';
import { listUpcomingDeadlines } from '../logic.js';

const MAX_DAYS = 3650;

export function registerListUpcomingDeadlines(server: McpServer, cache: FeedCache): void {
  server.registerTool(
    'list_upcoming_deadlines',
    {
      title: 'List upcoming response deadlines',
      description:
        'List RegEvents whose `response_deadline` falls between now and `days` days from now, ' +
        'soonest first. Events already past their deadline, and events with no deadline at all ' +
        '(most guidance, warnings, reports), are excluded.',
      inputSchema: {
        days: z
          .number()
          .int()
          .positive()
          .max(MAX_DAYS)
          .optional()
          .describe('Look-ahead window in days (default 30).'),
      },
    },
    async ({ days }) => {
      const result = await cache.get();
      if (result.status !== 'ok') return feedErrorResult(result);

      const window = days ?? 30;
      const deadlines = listUpcomingDeadlines(result.document, window);

      return {
        content: [
          {
            type: 'text',
            text:
              deadlines.length === 0
                ? `No response deadlines in the next ${window} day(s).`
                : `${deadlines.length} deadline(s) in the next ${window} day(s):\n` +
                  deadlines
                    .map(
                      d =>
                        `- ${d.event.response_deadline} (${d.daysRemaining}d) [${d.event.regulator}] ${d.event.title}`
                    )
                    .join('\n'),
          },
        ],
        structuredContent: {
          days: window,
          deadlines: deadlines.map(d => ({ event: d.event, days_remaining: d.daysRemaining })),
        },
      };
    }
  );
}
