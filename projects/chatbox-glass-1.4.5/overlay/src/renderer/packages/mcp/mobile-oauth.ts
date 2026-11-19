import { Capacitor, registerPlugin } from '@capacitor/core'
import type { MCPAuthorizationCallback } from '@shared/oauth'

const nativeOAuth = registerPlugin<{
  authorize(options: { authorizationUrl: string; state: string }): Promise<MCPAuthorizationCallback>
}>('AshMcpOAuth')

export function authorizeMobileMcp(authorizationUrl: string, state: string) {
  if (Capacitor.getPlatform() !== 'android') throw new Error('浏览器 MCP 授权目前仅适配 Android')
  return nativeOAuth.authorize({ authorizationUrl, state })
}
