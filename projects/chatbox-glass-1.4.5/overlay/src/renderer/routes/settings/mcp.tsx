import { Box, Text, Title } from '@mantine/core'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { BuiltinServersSection } from '@/components/settings/mcp/BuiltinServersSection'
import CustomServersSection from '@/components/settings/mcp/CustomServersSection'
import { parseServerFromJson } from '@/components/settings/mcp/utils'
import type { MCPServerConfig } from '@/packages/mcp/types'
import { decodeBase64 } from '@/utils/base64'
import platform from '@/platform'

const searchSchema = z.object({
  install: z.string().optional(), // b64 encoded config
})

export const Route = createFileRoute('/settings/mcp')({
  component: RouteComponent,
  validateSearch: zodValidator(searchSchema),
})

export function RouteComponent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const searchParams = Route.useSearch()
  const [installConfig, setInstallConfig] = useState<MCPServerConfig | undefined>(undefined)

  // Handle install parameter from search params
  useEffect(() => {
    if (searchParams.install) {
      try {
        const config = parseServerFromJson(decodeBase64(searchParams.install))
        setInstallConfig(config)
      } catch (err) {
        console.error(err)
      }
      // Clear search params immediately after reading
      navigate({
        to: '/settings/mcp',
        search: {},
        replace: true,
      })
    }
  }, [searchParams.install, navigate])

  return (
    <Box p="md">
      <Title order={5}>{t('MCP Settings')}</Title>
      {platform.type === 'mobile' && <Text size="sm" c="dimmed" mt="sm">支持远程 Streamable HTTP MCP，可填写 Authorization 等自定义请求头。Termux 工具可填写本机 HTTP 服务地址。连接后请在新对话中选择支持工具的模型，并切换到工作模式；普通聊天模式不会调用工具。Android 已支持浏览器 OAuth 登录（例如 Supabase），登录完成后会返回继续连接；若停留在浏览器，请点“返回 Chatbox”。传统 SSE 与本地命令暂不支持。</Text>}
      <Box className="mt-8">
        <BuiltinServersSection />
      </Box>
      <Box className="mt-8">
        <CustomServersSection installConfig={installConfig} />
      </Box>
    </Box>
  )
}
