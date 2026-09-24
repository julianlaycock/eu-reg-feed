/**
 * Turn a `FeedLoadResult` that is not `ok` into an MCP tool error result.
 *
 * Every tool that reads the feed goes through this, so a client sees the same
 * shape of error whether the local file is missing, the remote host is down,
 * or the JSON on either end does not match the RegEvent schema.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { FeedLoadResult } from './feedSource.js';

export function feedErrorResult(result: Extract<FeedLoadResult, { status: 'invalid' | 'unavailable' }>): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: result.message }],
  };
}
