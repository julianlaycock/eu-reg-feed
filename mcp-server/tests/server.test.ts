import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import { fixtureConfig } from './testConfig.js';

/**
 * End-to-end tests over a real MCP client/server pair, linked in-process
 * with the SDK's `InMemoryTransport` instead of stdio. This exercises tool
 * registration, zod input validation, and the actual JSON-RPC round trip,
 * not just the pure functions in `logic.ts`.
 */
describe('MCP server (in-memory transport)', () => {
  let client: Client;

  beforeAll(async () => {
    const server = createServer(fixtureConfig());
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '0.0.0' });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  afterAll(async () => {
    await client.close();
  });

  it('lists all four tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map(t => t.name).sort();
    expect(names).toEqual(['get_event', 'list_sources', 'list_upcoming_deadlines', 'search_events']);
  });

  it('lists the RegEvent schema resource', async () => {
    const { resources } = await client.listResources();
    expect(resources.some(r => r.name === 'regevent-schema')).toBe(true);
  });

  it('search_events returns structured content matching the pure-function result', async () => {
    const result = await client.callTool({ name: 'search_events', arguments: { regulator: 'eba' } });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { events: unknown[]; count: number };
    expect(structured.count).toBe(2);
    expect(structured.events).toHaveLength(2);
  });

  it('get_event returns the matching event', async () => {
    const result = await client.callTool({
      name: 'get_event',
      arguments: { id: 'urn:regevent:v2:cssf:p-128522' },
    });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { event: { title: string } };
    expect(structured.event.title).toContain('DAC Investments');
  });

  it('get_event reports isError for an unknown id, not a protocol-level failure', async () => {
    const result = await client.callTool({ name: 'get_event', arguments: { id: 'urn:regevent:v2:esma:nope' } });
    expect(result.isError).toBe(true);
  });

  it('list_upcoming_deadlines respects the days window', async () => {
    const result = await client.callTool({ name: 'list_upcoming_deadlines', arguments: { days: 3650 } });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { deadlines: unknown[] };
    expect(structured.deadlines.length).toBeGreaterThan(0);
  });

  it('list_sources reports working and planned regulators plus live feed stats', async () => {
    const result = await client.callTool({ name: 'list_sources', arguments: {} });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as {
      regulators: { id: string; status: string }[];
      feed: { total_events: number };
    };
    expect(structured.regulators.some(r => r.id === 'esma' && r.status === 'working')).toBe(true);
    expect(structured.feed.total_events).toBe(5);
  });

  it('reports isError for an out-of-range limit, caught at the input-validation layer', async () => {
    const result = await client.callTool({ name: 'search_events', arguments: { limit: 99999 } });
    expect(result.isError).toBe(true);
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('less than or equal to 100');
  });

  it('reads the RegEvent schema resource and gets back valid JSON Schema', async () => {
    const { contents } = await client.readResource({ uri: 'eu-reg-feed://schema/regevent' });
    expect(contents).toHaveLength(1);
    const parsed = JSON.parse(contents[0].text as string);
    expect(parsed.title).toBe('RegEvent');
  });
});
