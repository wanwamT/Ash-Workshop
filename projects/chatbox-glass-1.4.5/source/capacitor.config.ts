import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'xyz.chatboxapp.ashglass',
  appName: 'Chatbox Glass',
  webDir: 'release/app/dist/renderer',
  server: { androidScheme: 'https' },
  plugins: {
    SplashScreen: { launchAutoHide: true, launchShowDuration: 1200, backgroundColor: '#202335' },
    CapacitorHttp: { enabled: true },
  },
}
export default config
