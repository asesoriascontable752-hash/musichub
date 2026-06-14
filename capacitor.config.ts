import type { CapacitorConfig } from '@capacitor/cli'

// Change SERVER_URL to your Railway/Vercel URL after deploying
const SERVER_URL = process.env.CAPACITOR_SERVER_URL || 'http://10.0.2.2:3000'

const config: CapacitorConfig = {
  appId: 'com.musichub.app',
  appName: 'MusicHub',
  webDir: 'out',
  server: {
    // Points to the live server — APK connects to your deployed app
    url: SERVER_URL,
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#121212',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
}

export default config
