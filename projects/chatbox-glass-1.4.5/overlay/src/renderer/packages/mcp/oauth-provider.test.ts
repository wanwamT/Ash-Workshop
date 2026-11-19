import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({
  platform: { type: 'mobile', openLink: vi.fn() },
  settings: { mcp: { oauth: {} as Record<string, any> } },
  authorize: vi.fn(),
}))
vi.mock('@/platform', () => ({ default: mock.platform }))
vi.mock('@/stores/settingsStore', () => ({ settingsStore: { getState: () => ({ ...mock.settings, setSettings: (fn: any) => fn(mock.settings) }) } }))
vi.mock('./mobile-oauth', () => ({ authorizeMobileMcp: mock.authorize }))
import { MCPOAuthProvider } from './oauth-provider'

function authURL(state: string) {
  const url = new URL('https://auth.example.com/authorize')
  url.searchParams.set('state', state)
  url.searchParams.set('redirect_uri', 'http://127.0.0.1:1456/callback')
  return url
}
beforeEach(() => {
  mock.platform.type = 'mobile'; mock.platform.openLink.mockReset(); mock.authorize.mockReset()
  mock.settings.mcp.oauth = {}
})
describe('MCP OAuth browser round trip', () => {
  it('starts native callback flow without Electron and returns the authorization code', async () => {
    mock.authorize.mockResolvedValue({ code: 'test-code', iss: 'https://auth.example.com' })
    const provider = new MCPOAuthProvider('s1')
    const state = provider.state()
    await provider.redirectToAuthorization(authURL(state))
    expect(mock.authorize).toHaveBeenCalledWith(authURL(state).toString(), state)
    expect(await provider.waitForAuthorizationCallback()).toEqual({ code: 'test-code', iss: 'https://auth.example.com' })
    expect(provider.waitForAuthorizationCallback()).toBeUndefined()
    expect(mock.platform.openLink).not.toHaveBeenCalled()
  })
  it('never launches the browser during background bootstrap', async () => {
    const provider = new MCPOAuthProvider('s1', false)
    await expect(provider.redirectToAuthorization(authURL(provider.state()))).rejects.toThrow()
    expect(mock.authorize).not.toHaveBeenCalled()
  })
  it('rejects missing or mismatched state before opening a browser', async () => {
    const provider = new MCPOAuthProvider('s1'); provider.state()
    await expect(provider.redirectToAuthorization(authURL('wrong'))).rejects.toThrow('状态')
    expect(mock.authorize).not.toHaveBeenCalled()
  })
  it('propagates native cancel/timeout errors without swallowing them', async () => {
    mock.authorize.mockRejectedValue(new Error('登录等待超时'))
    const provider = new MCPOAuthProvider('s1')
    await provider.redirectToAuthorization(authURL(provider.state()))
    await expect(provider.waitForAuthorizationCallback()).rejects.toThrow('登录等待超时')
  })
  it('isolates tokens and PKCE verifiers between MCP servers', () => {
    const a = new MCPOAuthProvider('a'), b = new MCPOAuthProvider('b')
    a.saveTokens({ access_token: 'test-only', token_type: 'Bearer' })
    a.saveCodeVerifier('test-verifier')
    expect(a.tokens()?.access_token).toBe('test-only'); expect(b.tokens()).toBeUndefined()
    expect(a.codeVerifier()).toBe('test-verifier'); expect(() => b.codeVerifier()).toThrow()
    a.invalidateCredentials('tokens'); expect(a.tokens()).toBeUndefined(); expect(a.codeVerifier()).toBe('test-verifier')
  })
  it('keeps the desktop callback and browser path working', async () => {
    mock.platform.type = 'desktop'
    const invoke = vi.fn().mockResolvedValue({ code: 'desktop-test' })
    vi.stubGlobal('window', { electronAPI: { invoke } })
    try {
      const provider = new MCPOAuthProvider('s1')
      const url = authURL(provider.state())
      await provider.redirectToAuthorization(url)
      expect(invoke).toHaveBeenCalledWith('oauth:mcp-wait-callback', 1456)
      expect(mock.platform.openLink).toHaveBeenCalledWith(url.toString())
      expect(await provider.waitForAuthorizationCallback()).toEqual({ code: 'desktop-test' })
    } finally { vi.unstubAllGlobals() }
  })
})
