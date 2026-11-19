import { describe, expect, test } from 'vitest'
import { CurrentPlatformCapabilities } from './CurrentPlatformCapabilities'

describe('CurrentPlatformCapabilities', () => {
  test('enables the Agent Mode capability for desktop-like hosts', () => {
    const capabilities = new CurrentPlatformCapabilities({ isDesktopLike: true })

    expect(capabilities.supports('agent-mode')).toBe(true)
  })

  test('disables the Agent Mode capability for non-desktop hosts', () => {
    const capabilities = new CurrentPlatformCapabilities({ isDesktopLike: false })

    expect(capabilities.supports('agent-mode')).toBe(false)
  })
  test('enables mobile MCP orchestration without marking the host desktop-like', () => {
    const source = { isDesktopLike: false, type: 'mobile' }
    expect(new CurrentPlatformCapabilities(source).supports('agent-mode')).toBe(true)
    expect(source.isDesktopLike).toBe(false)
    expect(new CurrentPlatformCapabilities({ isDesktopLike: false, type: 'web' }).supports('agent-mode')).toBe(false)
  })
})
