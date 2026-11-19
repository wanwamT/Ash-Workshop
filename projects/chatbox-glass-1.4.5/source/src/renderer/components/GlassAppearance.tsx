import { GLASS_DEFAULTS, type GlassAppearanceConfig } from '@chatbox/core/domain/settings/settings-schema'
import { Alert, Button, ColorInput, FileButton, Group, Image, Select, Slider, Stack, Switch, Text, Textarea } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { type ReactNode, useEffect, useState } from 'react'
import { blobToDataUrl } from '@/routes/image-creator/-components/constants'
import storage from '@/storage'
import { useSettingsStore } from '@/stores/settingsStore'
import { saveImage } from '@/utils/image'
import './glass-appearance.css'

export { GLASS_DEFAULTS }

const HEX_COLOR = /^$|^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const useGlassConfig = () => useSettingsStore((s) => s.glassAppearance) ?? GLASS_DEFAULTS

function useWallpaper(key: string) {
  const { data } = useQuery({
    queryKey: ['ash-wallpaper', key],
    queryFn: async () => {
      const blob = await storage.getBlob(key).catch(() => null)
      // Only locally imported raster images are accepted as CSS backgrounds.
      if (!blob) return null
      const url = blobToDataUrl(blob)
      return /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(url) ? url : null
    },
    enabled: !!key,
    staleTime: Number.POSITIVE_INFINITY,
  })
  return key ? data ?? null : null
}

export function GlassAppearance() {
  const config = useGlassConfig()
  const location = useLocation()
  const path = location.pathname
  const settingsOpen = !!(location.search as { settings?: string } | undefined)?.settings
  const settingsActive = settingsOpen || path === '/settings' || path.startsWith('/settings/')
  const enabled = config.enabled && !settingsOpen && (path === '/' || path.startsWith('/session/'))
  const sidebarImage = useWallpaper(config.sidebarBackgroundKey)
  const settingsImage = useWallpaper(config.settingsBackgroundKey)
  useEffect(() => {
    const root = document.documentElement
    root.dataset.ashEnabled = String(config.enabled)
    root.dataset.ashGlass = String(enabled)
    root.dataset.ashSettingsActive = String(settingsActive)
    root.dataset.ashSidebarImage = String(!!sidebarImage)
    root.dataset.ashSettingsImage = String(!!settingsImage)
    const values: Record<string, string> = {
      '--ash-blur': `${config.blur}px`,
      '--ash-radius': `${config.radius}px`,
      '--ash-main-opacity': `${config.mainOpacity}%`,
      '--ash-header-opacity': `${config.headerOpacity}%`,
      '--ash-header-filter': config.headerOpacity === 0 ? 'none' : `blur(${config.blur * config.headerOpacity / 100}px) saturate(${100 + 15 * config.headerOpacity / 100}%)`,
      '--ash-header-edge': `color-mix(in srgb,var(--ash-edge) ${config.headerOpacity}%,transparent)`,
      '--ash-header-shadow': config.headerOpacity === 0 ? 'none' : 'var(--ash-shadow)',
      '--ash-composer-opacity': `${config.composerOpacity}%`,
      '--ash-composer-filter': config.composerOpacity === 0 ? 'none' : `blur(${config.blur * config.composerOpacity / 100}px) saturate(${100 + 15 * config.composerOpacity / 100}%)`,
      '--ash-composer-edge': `color-mix(in srgb,var(--ash-edge) ${config.composerOpacity}%,transparent)`,
      '--ash-composer-shadow': config.composerOpacity === 0 ? 'none' : 'var(--ash-shadow)',
      '--ash-bubble-opacity': `${config.assistantBubbleOpacity}%`,
      '--ash-assistant-opacity': `${config.assistantBubbleOpacity}%`,
      '--ash-user-opacity': `${config.userBubbleOpacity}%`,
      '--ash-control-filter': config.controlOpacity === 0 ? 'none' : `blur(${config.blur * config.controlOpacity / 100}px) saturate(${100 + 15 * config.controlOpacity / 100}%)`,
      '--ash-control-edge': `color-mix(in srgb,var(--ash-edge) ${config.controlOpacity}%,transparent)`,
      '--ash-control-shadow': config.controlOpacity === 0 ? 'none' : 'var(--ash-shadow)',
      '--ash-control-opacity': `${config.controlOpacity}%`,
      '--ash-control-color': config.controlColor || 'var(--ash-tint)',
      '--ash-control-text': config.controlTextColor || 'var(--ash-interface-text)',
      '--ash-process-blur': `${config.blur * config.processOpacity / 100}px`,
      '--ash-process-opacity': `${config.processOpacity}%`,
      '--ash-process-color': config.processColor || 'var(--ash-assistant-color)',
      '--ash-process-text': config.processTextColor || 'var(--ash-assistant-text)',
      '--ash-content-opacity': `${config.contentOpacity}%`,
      '--ash-content-color': config.contentColor || 'var(--ash-assistant-color)',
      '--ash-bubble-width': `${config.bubbleWidth}%`,
      '--ash-assistant-color': config.assistantBubbleColor || 'var(--ash-tint)',
      '--ash-user-color': config.userBubbleColor || 'var(--chatbox-background-brand-secondary,var(--ash-tint))',
      '--ash-assistant-text': config.assistantTextColor || 'var(--chatbox-tint-primary)',
      '--ash-user-text': config.userTextColor || 'var(--chatbox-tint-primary)',
      '--ash-interface-text': config.interfaceTextColor || 'var(--chatbox-tint-primary)',
      '--ash-sidebar-image': sidebarImage ? `url("${sidebarImage}")` : 'none',
      '--ash-settings-image': settingsImage ? `url("${settingsImage}")` : 'none',
    }
    for (const [key, value] of Object.entries(values)) root.style.setProperty(key, value)
    return () => {
      for (const key of Object.keys(values)) root.style.removeProperty(key)
      delete root.dataset.ashEnabled
      delete root.dataset.ashGlass
      delete root.dataset.ashSettingsActive
      delete root.dataset.ashSidebarImage
      delete root.dataset.ashSettingsImage
    }
  }, [enabled, settingsActive, config, sidebarImage, settingsImage])
  // Settings never load arbitrary user CSS, so recovery controls stay accessible.
  return enabled && config.customCss ? <style data-ash-custom-style>{config.customCss}</style> : null
}

function OpacityControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <Stack gap={4}>
    <Text size="sm">{label}：{value}%</Text>
    <Slider aria-label={label} thumbLabel={label} min={0} max={100} value={value} onChange={onChange} marks={[{ value: 0, label: '全透明' }, { value: 100, label: '不透明' }]} mb="sm" />
  </Stack>
}

function HexColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => { setDraft(value) }, [value])
  return <ColorInput
    label={label}
    description="可直接输入色号；清空则跟随主题"
    placeholder="#DDE7F2"
    format="hex"
    value={draft}
    onChange={(text) => { setDraft(text); if (HEX_COLOR.test(text)) onChange(text) }}
    error={!HEX_COLOR.test(draft) ? '请输入 #RGB、#RRGGBB 或带透明度的十六进制色号' : undefined}
    swatches={['#FFFFFF', '#DDE7F2', '#D7C5E8', '#D0E6DC', '#202335', '#273F53', '#111827', '#3C2D42']}
  />
}

// Keep imported wallpapers small and strip metadata before writing to local blob storage.
export async function prepareWallpaper(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请选择 JPG、PNG 或 WebP 图片')
  if (file.size > 20 * 1024 * 1024) throw new Error('请选择小于 20 MB 的图片')
  const url = URL.createObjectURL(file)
  try {
    const image = new window.Image()
    image.src = url
    await image.decode()
    const ratio = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('图片处理失败，请重新选择')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally { URL.revokeObjectURL(url) }
}

function WallpaperControl({ label, storageKey, onChange }: { label: string; storageKey: string; onChange: (key: string) => void }) {
  const image = useWallpaper(storageKey)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const upload = async (file: File | null) => {
    if (!file) return
    setBusy(true); setError('')
    try {
      const data = await prepareWallpaper(file)
      const key = await saveImage('ash-wallpaper', data)
      onChange(key)
    } catch (e) { setError(e instanceof Error ? e.message : '图片读取失败') }
    finally { setBusy(false) }
  }
  return <Stack gap="xs">
    <Text size="sm" fw={500}>{label}</Text>
    {image && <Image src={image} h={100} radius="md" fit="cover" alt={`${label}预览`} />}
    <Group>
      <FileButton accept="image/jpeg,image/png,image/webp" onChange={upload}>{(props) => <Button {...props} variant="light" loading={busy}>{storageKey ? '更换图片' : '选择图片'}</Button>}</FileButton>
      <Button variant="subtle" disabled={!storageKey || busy} onClick={() => { onChange(''); setError('') }}>移除图片</Button>
    </Group>
    {error && <Alert color="red">{error}</Alert>}
  </Stack>
}

function AppearanceSection({ title, description, children, open = false }: {
  title: string; description: string; children: ReactNode; open?: boolean
}) {
  return <details open={open} className="rounded-lg border border-solid border-chatbox-border-primary p-3">
    <summary className="cursor-pointer select-none">
      <Text component="span" fw={600}>{title}</Text>
      <Text component="span" size="xs" c="dimmed" mt={4} style={{ display: 'block' }}>{description}</Text>
    </summary>
    <Stack gap="md" mt="md">{children}</Stack>
  </details>
}

export function GlassAppearanceSettings() {
  const config = useGlassConfig()
  const setSettings = useSettingsStore((s) => s.setSettings)
  const [draft, setDraft] = useState(config.customCss)
  const [error, setError] = useState('')
  useEffect(() => { setDraft(config.customCss) }, [config.customCss])
  const update = (values: Partial<GlassAppearanceConfig>) => setSettings((s) => {
    s.glassAppearance = { ...(s.glassAppearance ?? GLASS_DEFAULTS), ...values }
  })
  const importCss = async (file: File | null) => {
    if (!file) return
    if (file.size > 100000) { setError('CSS 文件请小于 100 KB'); return }
    try { setDraft(await file.text()); setError('') } catch { setError('文件读取失败，请重新选择') }
  }
  return <Stack gap="md" data-ash-appearance-settings>
    <Text fw={600}>玻璃美化 · Ash</Text>
    <Text size="sm" c="dimmed">透明度 0% 为全透明，100% 为不透明。对话背景沿用聊天背景设置。</Text>
    <Switch label="启用玻璃界面" checked={config.enabled} onChange={(e) => update({ enabled: e.currentTarget.checked })} />
    <AppearanceSection title="聊天气泡" description="分别调整你和 AI 的透明度、底色、文字，以及头像与分段。" open>
    <OpacityControl label="AI 气泡不透明度" value={config.assistantBubbleOpacity} onChange={(assistantBubbleOpacity) => update({ assistantBubbleOpacity })} />
    <HexColorControl label="AI 气泡颜色" value={config.assistantBubbleColor} onChange={(assistantBubbleColor) => update({ assistantBubbleColor })} />
    <HexColorControl label="AI 文字颜色" value={config.assistantTextColor} onChange={(assistantTextColor) => update({ assistantTextColor })} />
    <OpacityControl label="我的气泡不透明度" value={config.userBubbleOpacity} onChange={(userBubbleOpacity) => update({ userBubbleOpacity })} />
    <HexColorControl label="我的气泡颜色" value={config.userBubbleColor} onChange={(userBubbleColor) => update({ userBubbleColor })} />
    <HexColorControl label="我的文字颜色" value={config.userTextColor} onChange={(userTextColor) => update({ userTextColor })} />
    <Text size="sm">气泡最大宽度：{config.bubbleWidth}%（可用消息区域）</Text>
    <Slider aria-label="气泡最大宽度" thumbLabel="气泡最大宽度" min={60} max={100} value={config.bubbleWidth} onChange={(bubbleWidth) => update({ bubbleWidth })} />
    <Select label="AI 头像位置" data={[{ value: 'side', label: '侧边 · 头像与气泡并排' }, { value: 'top', label: '上方 · 气泡使用整行宽度' }]} value={config.assistantAvatarPosition} allowDeselect={false} onChange={(value) => { if (value === 'side' || value === 'top') update({ assistantAvatarPosition: value }) }} />
    <Select label="我的头像位置" data={[{ value: 'side', label: '侧边 · 头像与气泡并排' }, { value: 'top', label: '上方 · 气泡使用整行宽度' }]} value={config.userAvatarPosition} allowDeselect={false} onChange={(value) => { if (value === 'side' || value === 'top') update({ userAvatarPosition: value }) }} />
    <Switch aria-label="消息分割 · 连续气泡" label="消息分割 · 连续气泡" description="用户与 AI 均适用。支持按段落、换行或句子细分，顶层列表可拆成独立气泡；代码、嵌套列表仍保持完整。仅改变显示。" checked={config.splitMessages} onChange={(e) => update({ splitMessages: e.currentTarget.checked })} />
    <Select label="消息分割方式" data={[{ value: 'paragraph', label: '段落 · 按空行分割' }, { value: 'line', label: '细分 · 按换行及列表项分割' }, { value: 'sentence', label: '更细 · 普通文字按句子分割' }]} value={config.splitMode} disabled={!config.splitMessages} allowDeselect={false} onChange={(value) => { if (value === 'paragraph' || value === 'line' || value === 'sentence') update({ splitMode: value }) }} />
    </AppearanceSection>
    <AppearanceSection title="思考与工具过程" description="思考链、过程说明和工具调用的玻璃与文字。">
    <Text size="xs" c="dimmed">思考链、思考内容、过程说明和工具调用共用这里。颜色清空时跟随 AI 气泡与文字颜色。</Text>
    <OpacityControl label="过程区不透明度" value={config.processOpacity} onChange={(processOpacity) => update({ processOpacity })} />
    <HexColorControl label="过程区底色" value={config.processColor} onChange={(processColor) => update({ processColor })} />
    <HexColorControl label="过程区文字颜色" value={config.processTextColor} onChange={(processTextColor) => update({ processTextColor })} />
    </AppearanceSection>
    <AppearanceSection title="顶栏、输入栏与按钮" description="聊天与设置顶栏、输入区、消息操作栏和导航按钮。">
    <OpacityControl label="顶部栏不透明度" value={config.headerOpacity} onChange={(headerOpacity) => update({ headerOpacity })} />
    <Text size="xs" c="dimmed">顶栏和输入栏调到 0% 时，底色、模糊、边框和阴影一起清除；文字和按钮保持清晰。</Text>
    <OpacityControl label="输入栏不透明度" value={config.composerOpacity} onChange={(composerOpacity) => update({ composerOpacity })} />
    <Text fw={500}>工具栏与按钮玻璃</Text>
    <Text size="xs" c="dimmed">消息操作栏、跳转导航、底部箭头、停止按钮和等待动画统一跟随这里。</Text>
    <OpacityControl label="工具栏与按钮不透明度" value={config.controlOpacity} onChange={(controlOpacity) => update({ controlOpacity })} />
    <HexColorControl label="工具栏与按钮底色" value={config.controlColor} onChange={(controlColor) => update({ controlColor })} />
    <HexColorControl label="工具栏文字与图标颜色" value={config.controlTextColor} onChange={(controlTextColor) => update({ controlTextColor })} />
    </AppearanceSection>
    <AppearanceSection title="表格与代码" description="表格和代码区共用的玻璃底色与透明度。">
    <OpacityControl label="表格与代码不透明度" value={config.contentOpacity} onChange={(contentOpacity) => update({ contentOpacity })} />
    <HexColorControl label="表格与代码底色" value={config.contentColor} onChange={(contentColor) => update({ contentColor })} />
    </AppearanceSection>
    <AppearanceSection title="背景与界面文字" description="聊天背景遮罩、侧边栏和设置页图片，以及界面字色。">
    <OpacityControl label="主界面遮罩不透明度" value={config.mainOpacity} onChange={(mainOpacity) => update({ mainOpacity })} />
    <Text size="xs" c="dimmed">主界面调到 0% 显示清晰原图，调高则增加柔和底色；不会淡化文字。</Text>
    <WallpaperControl label="侧边栏图片背景" storageKey={config.sidebarBackgroundKey} onChange={(sidebarBackgroundKey) => update({ sidebarBackgroundKey })} />
    <WallpaperControl label="设置页图片背景" storageKey={config.settingsBackgroundKey} onChange={(settingsBackgroundKey) => update({ settingsBackgroundKey })} />
    <HexColorControl label="界面文字颜色" value={config.interfaceTextColor} onChange={(interfaceTextColor) => update({ interfaceTextColor })} />
    </AppearanceSection>
    <AppearanceSection title="模糊与圆角" description="统一调整玻璃模糊强度和圆角。">
    <Text size="sm">毛玻璃强度：{config.blur} px（调低可减少手机负担）</Text>
    <Slider aria-label="毛玻璃强度" thumbLabel="毛玻璃强度" min={0} max={28} value={config.blur} onChange={(blur) => update({ blur })} />
    <Text size="sm">圆角：{config.radius} px</Text>
    <Slider aria-label="圆角" thumbLabel="圆角" min={8} max={28} value={config.radius} onChange={(radius) => update({ radius })} />
    </AppearanceSection>
    <AppearanceSection title="高级样式" description="导入或编辑自定义 CSS。">
    <Textarea label="自定义 CSS" description="只作用于聊天页面，设置页不加载。" autosize minRows={4} maxRows={10} value={draft} maxLength={100000} onChange={(e) => setDraft(e.currentTarget.value)} spellCheck={false} />
    {error && <Alert color="red">{error}</Alert>}
    <Group>
      <FileButton accept=".css,text/css" onChange={importCss}>{(props) => <Button {...props} variant="light">导入 CSS</Button>}</FileButton>
      <Button onClick={() => update({ customCss: draft })}>保存样式</Button>
    </Group>
    </AppearanceSection>
    <Button variant="subtle" onClick={() => { update({ ...GLASS_DEFAULTS }); setDraft(''); setError('') }}>恢复默认</Button>
  </Stack>
}



