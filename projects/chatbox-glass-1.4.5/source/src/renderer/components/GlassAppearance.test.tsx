// @vitest-environment jsdom
import React from 'react'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GlassAppearanceSchema } from '@chatbox/core/domain/settings/settings-schema'
import { GlassAppearance, GlassAppearanceSettings, GLASS_DEFAULTS } from './GlassAppearance'

Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) })
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
const state = vi.hoisted(() => ({
  path: '/session/test', search: {} as Record<string, string>,
  settings: { glassAppearance: {} as typeof GLASS_DEFAULTS },
}))
vi.mock('@tanstack/react-router', () => ({ useLocation: () => ({ pathname: state.path, search: state.search }) }))
vi.mock('@/storage', () => ({ default: { getBlob: vi.fn(async () => 'data:image/jpeg;base64,YQ==') } }))
vi.mock('@/utils/image', () => ({ saveImage: vi.fn(async () => 'picture:ash-wallpaper:test') }))
vi.mock('@/routes/image-creator/-components/constants', () => ({ blobToDataUrl: (value: string) => value }))
vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: (select: (s: unknown) => unknown) => select({
    ...state.settings,
    setSettings: (update: (s: typeof state.settings) => void) => update(state.settings),
  }),
}))
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MantineProvider>{children}</MantineProvider></QueryClientProvider>
}
function renderSettings() {
  const result = render(<GlassAppearanceSettings />, { wrapper })
  result.container.querySelectorAll('details').forEach((section) => { section.open = true })
  return result
}
describe('glass appearance controls and persistence', () => {
  beforeEach(() => {
    state.path = '/session/test'; state.search = {}
    state.settings.glassAppearance = { ...GLASS_DEFAULTS, customCss: '.example { color: red }' }
  })
  it('does not load arbitrary CSS in settings routes or the full screen settings modal', () => {
    const { container, rerender } = render(<GlassAppearance />, { wrapper })
    expect(container.querySelector('style[data-ash-custom-style]')?.textContent).toContain('.example')
    state.path = '/settings/general'; rerender(<GlassAppearance />)
    expect(container.querySelector('style[data-ash-custom-style]')).toBeNull()
    expect(document.documentElement.dataset.ashGlass).toBe('false')
    state.path = '/session/test'; state.search = { settings: '/settings/general' }; rerender(<GlassAppearance />)
    expect(container.querySelector('style[data-ash-custom-style]')).toBeNull()
  })
  it('changes each role opacity independently without changing colors or process material', () => {
    const { unmount } = renderSettings()
    fireEvent.keyDown(screen.getByRole('slider', { name: 'AI 气泡不透明度' }), { key: 'ArrowLeft' })
    expect(state.settings.glassAppearance.assistantBubbleOpacity).toBe(75)
    expect(state.settings.glassAppearance.userBubbleOpacity).toBe(76)
    fireEvent.keyDown(screen.getByRole('slider', { name: '我的气泡不透明度' }), { key: 'ArrowRight' })
    expect(state.settings.glassAppearance.userBubbleOpacity).toBe(77)
    expect(state.settings.glassAppearance.assistantBubbleOpacity).toBe(75)
    expect(state.settings.glassAppearance.processOpacity).toBe(60)
    unmount()
    render(<GlassAppearance />, { wrapper })
    expect(document.documentElement.style.getPropertyValue('--ash-assistant-opacity')).toBe('75%')
    expect(document.documentElement.style.getPropertyValue('--ash-user-opacity')).toBe('77%')
  })
  it('keeps header opacity independent from composer and bubble opacity', () => {
    renderSettings()
    fireEvent.keyDown(screen.getByRole('slider', { name: '顶部栏不透明度' }), { key: 'ArrowLeft' })
    expect(state.settings.glassAppearance.headerOpacity).toBe(44)
    expect(state.settings.glassAppearance.composerOpacity).toBe(76)
    expect(state.settings.glassAppearance.bubbleOpacity).toBe(76)
  })
  it('saves tool material independently and rejects invalid color input', () => {
    renderSettings()
    fireEvent.keyDown(screen.getByRole('slider', { name: '工具栏与按钮不透明度' }), { key: 'ArrowLeft' })
    fireEvent.change(screen.getByLabelText('工具栏与按钮底色'), { target: { value: '#cfdfef' } })
    fireEvent.change(screen.getByLabelText('工具栏文字与图标颜色'), { target: { value: '#123456' } })
    expect(state.settings.glassAppearance.controlOpacity).toBe(44)
    expect(state.settings.glassAppearance.controlColor).toBe('#cfdfef')
    expect(state.settings.glassAppearance.controlTextColor).toBe('#123456')
    fireEvent.change(screen.getByLabelText('工具栏与按钮底色'), { target: { value: 'url(x)' } })
    expect(state.settings.glassAppearance.controlColor).toBe('#cfdfef')
    expect(state.settings.glassAppearance.contentOpacity).toBe(18)
    expect(state.settings.glassAppearance.bubbleOpacity).toBe(76)
  })
  it('applies saved tool and markdown colors to live chat and removes them on unmount', () => {
    state.settings.glassAppearance = { ...GLASS_DEFAULTS, controlColor: '#123456', controlTextColor: '#abcdef', controlOpacity: 0, contentColor: '#456789', contentOpacity: 25 }
    const { unmount } = render(<GlassAppearance />, { wrapper })
    const style = document.documentElement.style
    expect(style.getPropertyValue('--ash-control-color')).toBe('#123456')
    expect(style.getPropertyValue('--ash-control-text')).toBe('#abcdef')
    expect(style.getPropertyValue('--ash-control-opacity')).toBe('0%')
    expect(style.getPropertyValue('--ash-control-filter')).toBe('none')
    expect(style.getPropertyValue('--ash-control-shadow')).toBe('none')
    expect(style.getPropertyValue('--ash-content-color')).toBe('#456789')
    expect(style.getPropertyValue('--ash-content-opacity')).toBe('25%')
    unmount()
    expect(style.getPropertyValue('--ash-control-color')).toBe('')
  })
  it('saves process material independently and applies its text color live', () => {
    const { unmount } = renderSettings()
    fireEvent.change(screen.getByLabelText('过程区文字颜色'), { target: { value: '#345678' } })
    fireEvent.change(screen.getByLabelText('过程区底色'), { target: { value: '#abcdef' } })
    fireEvent.keyDown(screen.getByRole('slider', { name: '过程区不透明度' }), { key: 'ArrowLeft' })
    expect(state.settings.glassAppearance.processTextColor).toBe('#345678')
    expect(state.settings.glassAppearance.processColor).toBe('#abcdef')
    expect(state.settings.glassAppearance.processOpacity).toBe(59)
    expect(state.settings.glassAppearance.bubbleOpacity).toBe(76)
    fireEvent.change(screen.getByLabelText('过程区文字颜色'), { target: { value: 'url(x)' } })
    expect(state.settings.glassAppearance.processTextColor).toBe('#345678')
    unmount()
    const live = render(<GlassAppearance />, { wrapper })
    expect(document.documentElement.style.getPropertyValue('--ash-process-text')).toBe('#345678')
    expect(document.documentElement.style.getPropertyValue('--ash-process-opacity')).toBe('59%')
    live.unmount()
    expect(document.documentElement.style.getPropertyValue('--ash-process-text')).toBe('')
  })
  it('accepts a typed hex color, without saving invalid text or changing the other role', () => {
    renderSettings()
    const field = screen.getByLabelText('AI 气泡颜色')
    fireEvent.change(field, { target: { value: '#aabbcc' } })
    expect(state.settings.glassAppearance.assistantBubbleColor).toBe('#aabbcc')
    expect(state.settings.glassAppearance.userBubbleColor).toBe('')
    fireEvent.change(field, { target: { value: '#oops' } })
    expect(state.settings.glassAppearance.assistantBubbleColor).toBe('#aabbcc')
  })
  it('lets message splitting be switched on and off', () => {
    const { rerender } = renderSettings()
    fireEvent.click(screen.getByRole('switch', { name: '消息分割 · 连续气泡' }))
    expect(state.settings.glassAppearance.splitMessages).toBe(true)
    rerender(<GlassAppearanceSettings />)
    fireEvent.click(screen.getByRole('switch', { name: '消息分割 · 连续气泡' }))
    expect(state.settings.glassAppearance.splitMessages).toBe(false)
  })
  it('loads independent wallpaper references and clears all customization on recovery', async () => {
    state.settings.glassAppearance.sidebarBackgroundKey = 'picture:sidebar'
    state.settings.glassAppearance.settingsBackgroundKey = 'picture:settings'
    const { unmount } = render(<GlassAppearance />, { wrapper })
    await waitFor(() => expect(document.documentElement.dataset.ashSidebarImage).toBe('true'))
    expect(document.documentElement.style.getPropertyValue('--ash-settings-image')).toContain('data:image/jpeg')
    unmount()
    renderSettings()
    fireEvent.click(screen.getByText('恢复默认'))
    expect(state.settings.glassAppearance).toEqual(GLASS_DEFAULTS)
  })
})
describe('glass settings compatibility', () => {
  it('adds new material defaults to an older configuration without losing existing preferences', () => {
    const config = GlassAppearanceSchema.parse({ bubbleOpacity: 35, assistantBubbleColor: '#123456', splitMessages: true, customCss: '.saved{}' })
    expect(config.processOpacity).toBe(60)
    expect(config.processTextColor).toBe('')
    expect(config.controlOpacity).toBe(45)
    expect(config.contentOpacity).toBe(18)
    expect(config.controlColor).toBe('')
    expect(config.bubbleOpacity).toBe(35)
    expect(config.assistantBubbleOpacity).toBe(35)
    expect(config.userBubbleOpacity).toBe(35)
    expect(config.assistantBubbleColor).toBe('#123456')
    expect(config.splitMessages).toBe(true)
    expect(config.customCss).toBe('.saved{}')
  })
  it('migrates old shared opacity and preserves CSS', () => {
    const config = GlassAppearanceSchema.parse({ enabled: true, opacity: 65, customCss: '.x{}' })
    expect(config.composerOpacity).toBe(65)
    expect(config.bubbleOpacity).toBe(65)
    expect(config.assistantBubbleOpacity).toBe(65)
    expect(config.userBubbleOpacity).toBe(65)
    expect(config.headerOpacity).toBe(45)
    expect(config.customCss).toBe('.x{}')
  })
  it('preserves independent role values when reopening a saved configuration', () => {
    const saved = { bubbleOpacity: 55, assistantBubbleOpacity: 0, userBubbleOpacity: 100, assistantTextColor: '#123456', customCss: '.saved{}' }
    const config = GlassAppearanceSchema.parse(JSON.parse(JSON.stringify(saved)))
    expect(config.assistantBubbleOpacity).toBe(0)
    expect(config.userBubbleOpacity).toBe(100)
    expect(config.assistantTextColor).toBe('#123456')
    expect(config.customCss).toBe('.saved{}')
  })
  it('supports fully transparent surfaces and isolates an invalid color', () => {
    const config = GlassAppearanceSchema.parse({ headerOpacity: 0, composerOpacity: 0, bubbleOpacity: 0, userBubbleColor: '#ffaa00', assistantBubbleColor: 'url(x)' })
    expect(config.headerOpacity).toBe(0)
    expect(config.bubbleOpacity).toBe(0)
    expect(config.userBubbleColor).toBe('#ffaa00')
    expect(config.assistantBubbleColor).toBe('')
  })
})

describe('main transparency and independent avatar placement', () => {
  it('restores defaults with separate role positions and the fine splitter available', () => {
    const config = GlassAppearanceSchema.parse({ mainOpacity: 0, assistantAvatarPosition: 'top', userAvatarPosition: 'side', splitMode: 'sentence' })
    expect(config.mainOpacity).toBe(0)
    expect(config.assistantAvatarPosition).toBe('top')
    expect(config.userAvatarPosition).toBe('side')
    expect(config.splitMode).toBe('sentence')
  })
})




describe('composer and settings header transparency', () => {
  beforeEach(() => { state.path = '/session/test'; state.search = {}; state.settings.glassAppearance = { ...GLASS_DEFAULTS, blur: 20 } })
  it('scales the full composer and header materials independently, including a clear zero', () => {
    state.settings.glassAppearance.composerOpacity = 0
    state.settings.glassAppearance.headerOpacity = 25
    const ui = render(<GlassAppearance />, { wrapper })
    const root = document.documentElement
    expect(root.style.getPropertyValue('--ash-composer-filter')).toBe('none')
    expect(root.style.getPropertyValue('--ash-composer-shadow')).toBe('none')
    expect(root.style.getPropertyValue('--ash-composer-edge')).toContain(' 0%')
    expect(root.style.getPropertyValue('--ash-header-filter')).toBe('blur(5px) saturate(103.75%)')
    state.settings.glassAppearance = { ...state.settings.glassAppearance, headerOpacity: 0, composerOpacity: 50 }
    ui.rerender(<GlassAppearance />)
    expect(root.style.getPropertyValue('--ash-header-filter')).toBe('none')
    expect(root.style.getPropertyValue('--ash-header-shadow')).toBe('none')
    expect(root.style.getPropertyValue('--ash-composer-filter')).toBe('blur(10px) saturate(107.5%)')
    ui.unmount()
    expect(root.style.getPropertyValue('--ash-composer-filter')).toBe('')
    expect(root.dataset.ashSettingsActive).toBeUndefined()
  })
  it('marks direct settings routes and modal settings, then restores chat and keeps custom CSS out', () => {
    state.settings.glassAppearance.customCss = '.private-chat-style{}'
    const ui = render(<GlassAppearance />, { wrapper })
    state.path = '/settings/general'; ui.rerender(<GlassAppearance />)
    expect(document.documentElement.dataset.ashSettingsActive).toBe('true')
    expect(document.documentElement.dataset.ashGlass).toBe('false')
    expect(ui.container.querySelector('[data-ash-custom-style]')).toBeNull()
    state.path = '/about'; ui.rerender(<GlassAppearance />)
    expect(document.documentElement.dataset.ashSettingsActive).toBe('false')
    state.path = '/session/test'; state.search = { settings: '/settings/general' }; ui.rerender(<GlassAppearance />)
    expect(document.documentElement.dataset.ashSettingsActive).toBe('true')
    expect(ui.container.querySelector('[data-ash-custom-style]')).toBeNull()
    state.search = {}; ui.rerender(<GlassAppearance />)
    expect(document.documentElement.dataset.ashSettingsActive).toBe('false')
    expect(document.documentElement.dataset.ashGlass).toBe('true')
  })
})
