// @vitest-environment jsdom
import React from 'react'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useStore } from 'zustand'
import { SettingsService } from '@chatbox/core/application/settings'
import { createSettingsStore } from '@chatbox/react/stores'
import { GlassAppearance, GlassAppearanceSettings } from './GlassAppearance'

let store: ReturnType<typeof createSettingsStore>
const location = vi.hoisted(() => ({ pathname: '/session/test', search: {} as Record<string, string> }))
vi.mock('@tanstack/react-router', () => ({ useLocation: () => location }))
vi.mock('@/stores/settingsStore', () => ({ useSettingsStore: (select: (s: ReturnType<typeof store.getState>) => unknown) => useStore(store, select) }))
vi.mock('@/storage', () => ({ default: { getBlob: vi.fn(async () => null) } }))
vi.mock('@/utils/image', () => ({ saveImage: vi.fn() }))
vi.mock('@/routes/image-creator/-components/constants', () => ({ blobToDataUrl: vi.fn() }))
Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) })
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}><MantineProvider>{children}</MantineProvider></QueryClientProvider>
}
afterEach(() => { store?.getState().destroy(); location.search = {} })
it('updates process and control opacity through the real store and restores them after reopening', async () => {
  let saved: unknown = null
  const storage = { read: async () => saved, write: async (value: unknown) => { saved = value }, remove: async () => { saved = null } }
  const service = new SettingsService(storage, { isDesktopLike: false })
  store = createSettingsStore(service)
  await store.getState().hydrate()
  const ui = render(<><GlassAppearance /><GlassAppearanceSettings /></>, { wrapper })
  ui.container.querySelectorAll('details').forEach((section) => { section.open = true })
  fireEvent.keyDown(screen.getByRole('slider', { name: '过程区不透明度' }), { key: 'Home' })
  await waitFor(() => expect(store.getState().glassAppearance.processOpacity).toBe(0))
  expect(document.documentElement.style.getPropertyValue('--ash-process-opacity')).toBe('0%')
  expect(document.documentElement.style.getPropertyValue('--ash-process-blur')).toBe('0px')
  fireEvent.keyDown(screen.getByRole('slider', { name: '工具栏与按钮不透明度' }), { key: 'Home' })
  await waitFor(() => expect(store.getState().glassAppearance.controlOpacity).toBe(0))
  expect(document.documentElement.style.getPropertyValue('--ash-control-opacity')).toBe('0%')
  expect(document.documentElement.style.getPropertyValue('--ash-control-filter')).toBe('none')
  expect(document.documentElement.style.getPropertyValue('--ash-control-shadow')).toBe('none')
  fireEvent.keyDown(screen.getByRole('slider', { name: '输入栏不透明度' }), { key: 'Home' })
  await waitFor(() => expect(store.getState().glassAppearance.composerOpacity).toBe(0))
  expect(document.documentElement.style.getPropertyValue('--ash-composer-filter')).toBe('none')
  expect(document.documentElement.style.getPropertyValue('--ash-composer-shadow')).toBe('none')
  await service.flushPersistence()
  ui.unmount(); store.getState().destroy()
  const reopened = new SettingsService(storage, { isDesktopLike: false })
  store = createSettingsStore(reopened)
  await store.getState().hydrate()
  location.search = { settings: '/settings/general' }
  const live = render(<GlassAppearance />, { wrapper })
  expect(store.getState().glassAppearance.controlOpacity).toBe(0)
  expect(store.getState().glassAppearance.composerOpacity).toBe(0)
  expect(document.documentElement.dataset.ashSettingsActive).toBe('true')
  expect(document.documentElement.style.getPropertyValue('--ash-composer-filter')).toBe('none')
  expect(store.getState().glassAppearance.processOpacity).toBe(0)
  expect(document.documentElement.dataset.ashGlass).toBe('false')
  location.search = {}; live.rerender(<GlassAppearance />)
  expect(document.documentElement.dataset.ashGlass).toBe('true')
  expect(document.documentElement.style.getPropertyValue('--ash-control-filter')).toBe('none')
  expect(document.documentElement.style.getPropertyValue('--ash-process-opacity')).toBe('0%')
  expect(document.documentElement.style.getPropertyValue('--ash-process-blur')).toBe('0px')
})

