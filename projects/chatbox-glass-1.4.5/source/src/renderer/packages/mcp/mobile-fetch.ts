import { Capacitor, CapacitorHttp } from '@capacitor/core'

export const isNativeMCP = () => Capacitor.isNativePlatform()

/** Finite Streamable HTTP responses via native networking, including POST SSE bodies.
 * Optional long-lived GET notifications are declined; tools can be refreshed explicitly.
 */
export const mobileMcpFetch: typeof fetch = async (input, init) => {
  const request = input instanceof Request ? input : undefined
  const url = new URL(request?.url ?? String(input))
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('MCP 地址必须使用 HTTP 或 HTTPS')
  if (url.username || url.password) throw new Error('请把 MCP 凭据放在请求头中，不要放入网址')
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase()
  const signal = init?.signal ?? request?.signal
  signal?.throwIfAborted()
  const headers = new Headers(request?.headers)
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value))
  if (method === 'GET' && headers.get('accept')?.includes('text/event-stream')) {
    return new Response(null, { status: 405, headers: { allow: 'POST, DELETE' } })
  }
  let body = init?.body
  if (body === undefined && request && !['GET', 'HEAD'].includes(method)) body = await request.clone().text()
  if (body instanceof URLSearchParams) body = body.toString()
  if (body != null && typeof body !== 'string') throw new Error('手机版 MCP 仅接受文本或表单请求')
  signal?.throwIfAborted()
  const promise = CapacitorHttp.request({
    url: url.toString(), method, headers: Object.fromEntries(headers.entries()),
    data: body ?? undefined, responseType: 'text', connectTimeout: 15000, readTimeout: 90000,
    // Never forward a configured Authorization header across a server redirect.
    disableRedirects: true,
  })
  const response = await new Promise<Awaited<typeof promise>>((resolve, reject) => {
    const aborted = () => reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'))
    signal?.addEventListener('abort', aborted, { once: true })
    promise.then(resolve, reject).finally(() => signal?.removeEventListener('abort', aborted))
    if (signal?.aborted) aborted()
  })
  signal?.throwIfAborted()
  const resultHeaders = new Headers()
  for (const [key, value] of Object.entries(response.headers ?? {})) resultHeaders.set(key, String(value))
  let data = response.data == null ? '' : typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
  // Android CapacitorHttp reads SSE with BufferedReader.readLine(), which drops
  // the final empty line. Restore the event delimiter before the SDK parses it.
  if (resultHeaders.get('content-type')?.toLowerCase().includes('text/event-stream') && data) {
    data = data.replace(/\r\n/g, '\n')
    if (!data.endsWith('\n\n')) data += data.endsWith('\n') ? '\n' : '\n\n'
  }
  return new Response([204, 205, 304].includes(response.status) ? null : data, { status: response.status, headers: resultHeaders })
}

export function nativeMcpTransportOptions() {
  return isNativeMCP() ? { fetch: mobileMcpFetch } : {}
}

