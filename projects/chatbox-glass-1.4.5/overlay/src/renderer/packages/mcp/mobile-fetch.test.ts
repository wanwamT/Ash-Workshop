import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mobileMcpFetch, nativeMcpTransportOptions } from './mobile-fetch'
import { createMCPClient } from '@ai-sdk/mcp'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
const mock = vi.hoisted(() => ({ request: vi.fn(), native: true }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mock.native }, CapacitorHttp: { request: mock.request } }))
beforeEach(() => { mock.native = true; mock.request.mockReset() })
describe('native mobile MCP networking', () => {
  it('preserves bearer, protocol and session headers and returns parsed JSON responses', async () => {
    mock.request.mockResolvedValue({ status: 200, headers: { 'content-type': 'application/json', 'mcp-session-id': 's1' }, data: { jsonrpc: '2.0', id: 1, result: {} } })
    const response = await mobileMcpFetch('http://127.0.0.1:8765/mcp', { method: 'POST', headers: { Authorization: 'Bearer test-only', 'mcp-protocol-version': '2025-03-26' }, body: '{"jsonrpc":"2.0","id":1,"method":"initialize"}' })
    expect(mock.request.mock.calls[0][0]).toMatchObject({ method: 'POST', headers: { authorization: 'Bearer test-only', 'mcp-protocol-version': '2025-03-26' }, disableRedirects: true })
    expect(response.headers.get('mcp-session-id')).toBe('s1')
    expect((await response.json()).id).toBe(1)
  })
  it('returns finite POST event streams without rewriting the body', async () => {
    const body = 'event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{}}\n\n'
    mock.request.mockResolvedValue({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, data: body })
    const response = await mobileMcpFetch('https://example.com/mcp', { method: 'POST', body: '{}' })
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    expect(await response.text()).toBe(body)
  })
  it('declines optional notification GETs without opening a never-ending native request', async () => {
    const response = await mobileMcpFetch('https://example.com/mcp', { headers: { Accept: 'text/event-stream' } })
    expect(response.status).toBe(405)
    expect(mock.request).not.toHaveBeenCalled()
  })
  it('passes empty acknowledgements and authorization failures back to the SDK', async () => {
    mock.request.mockResolvedValueOnce({ status: 204, headers: {}, data: '' }).mockResolvedValueOnce({ status: 401, headers: { 'www-authenticate': 'Bearer' }, data: 'Unauthorized' })
    expect((await mobileMcpFetch('https://example.com/mcp', { method: 'DELETE' })).status).toBe(204)
    expect((await mobileMcpFetch('https://example.com/mcp', { method: 'POST', body: '{}' })).status).toBe(401)
  })
  it('does not send pre-aborted requests or non-HTTP URLs', async () => {
    const controller = new AbortController(); controller.abort()
    await expect(mobileMcpFetch('https://example.com/mcp', { signal: controller.signal })).rejects.toThrow()
    await expect(mobileMcpFetch('file:///private')).rejects.toThrow('HTTP')
    expect(mock.request).not.toHaveBeenCalled()
  })
  it('only overrides transport fetch on native platforms', () => {
    expect(nativeMcpTransportOptions().fetch).toBe(mobileMcpFetch)
    mock.native = false
    expect(nativeMcpTransportOptions()).toEqual({})
  })
})


it('lists and executes an MCP tool through the native fetch adapter', async () => {
  mock.request.mockImplementation(async (options) => {
    const request = options.data ? JSON.parse(options.data) : undefined
    const headers = { 'content-type': 'application/json', 'mcp-session-id': 'native-test' }
    if (request?.id === undefined) return { status: 202, headers, data: '' }
    const result = request.method === 'initialize'
      ? { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'native-fixture', version: '1.0' } }
      : request.method === 'tools/list'
        ? { tools: [{ name: 'echo', description: 'Test echo', inputSchema: { type: 'object', properties: { word: { type: 'string' } }, required: ['word'] } }] }
        : { content: [{ type: 'text', text: request.params.arguments.word }] }
    return { status: 200, headers, data: { jsonrpc: '2.0', id: request.id, result } }
  })
  const client = await createMCPClient({ name: 'native-test', transport: new StreamableHTTPClientTransport(new URL('https://example.com/mcp'), { fetch: mobileMcpFetch }) })
  try {
    const tools = await client.tools()
    expect(Object.keys(tools)).toEqual(['echo'])
    const result = await tools.echo.execute?.({ word: 'native works' }, { toolCallId: 't1', messages: [] })
    expect(result).toMatchObject({ content: [{ type: 'text', text: 'native works' }] })
    const methods = mock.request.mock.calls.map(([options]) => options.data ? JSON.parse(options.data).method : '').filter(Boolean)
    expect(methods).toContain('tools/list')
    expect(methods).toContain('tools/call')
  } finally { await client.close() }
})

it.each(['\n', ''])('parses Android-trimmed SSE responses through the real SDK (ending %j)', async (ending) => {
  mock.request.mockImplementation(async (options) => {
    const request = options.data ? JSON.parse(options.data) : undefined
    if (request?.id === undefined) return { status: 202, headers: {}, data: '' }
    const result = request.method === 'initialize'
      ? { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'android-sse', version: '1' } }
      : request.method === 'tools/list'
        ? { tools: [{ name: 'echo', description: 'Echo', inputSchema: { type: 'object', properties: { word: { type: 'string' } }, required: ['word'] } }] }
        : { content: [{ type: 'text', text: request.params.arguments.word }] }
    return { status: 200, headers: { 'Content-Type': 'text/event-stream' }, data: 'event: message\ndata: ' + JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + ending }
  })
  const client = await createMCPClient({ name: 'android-sse-test', transport: new StreamableHTTPClientTransport(new URL('https://example.com/mcp'), { fetch: mobileMcpFetch }) })
  try {
    const tools = await client.tools()
    const result = await tools.echo.execute?.({ word: 'sse works' }, { toolCallId: 'sse1', messages: [] })
    expect(result).toMatchObject({ content: [{ type: 'text', text: 'sse works' }] })
  } finally { await client.close() }
}, 3000)

it('sends OAuth token exchange and refresh form bodies through native HTTP', async () => {
  mock.request.mockResolvedValue({ status: 200, headers: { 'content-type': 'application/json' }, data: { access_token: 'test-token', token_type: 'Bearer' } })
  const form = new URLSearchParams({ grant_type: 'authorization_code', code: 'test+code', code_verifier: 'test-verifier' })
  const response = await mobileMcpFetch('https://auth.example.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
  expect(mock.request.mock.calls[0][0]).toMatchObject({ method: 'POST', data: form.toString(), headers: { 'content-type': 'application/x-www-form-urlencoded' } })
  expect((await response.json()).access_token).toBe('test-token')
})

