import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FeedCache } from '../feedSource.js';
import { feedErrorResult } from '../errors.js';
import { listSources } from '../logic.js';

export function registerListSources(server: McpServer, cache: FeedCache): void {
  server.registerTool(
    'list_sources',
    {
      title: 'List regulator sources',
      description:
        'List every regulator eu-reg-feed targets, whether it is currently working or only ' +
        'planned, and the live per-source stats (event count, errors, fetch time) from the ' +
        'currently loaded feed.',
      inputSchema: {},
    },
    async () => {
      const result = await cache.get();
      if (result.status !== 'ok') return feedErrorResult(result);

      const summary = listSources(result.document);
      const working = summary.regulators.filter(r => r.status === 'working').map(r => r.id);
      const planned = summary.regulators.filter(r => r.status === 'planned').map(r => r.id);

      return {
        content: [
          {
            type: 'text',
            text:
              `Working: ${working.join(', ')}\n` +
              `Planned: ${planned.join(', ')}\n` +
              `Feed generated: ${summary.feed.generated_at} ` +
              `(${summary.feed.total_events} events, ${summary.feed.total_errors} errors)`,
          },
        ],
        structuredContent: { ...summary },
      };
    }
  );
}
