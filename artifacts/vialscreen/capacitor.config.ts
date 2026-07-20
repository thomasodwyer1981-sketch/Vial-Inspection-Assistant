import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pepscan.app',
  appName: 'PepScan',
  webDir: 'dist/public',
  // In production Capacitor builds the server.url is NOT set — the app serves
  // its own bundled web assets.  VITE_API_BASE_URL is used instead (see src/utils/api.ts).
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0E1E35',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
  android: {
    // Required for getUserMedia / camera in WebView on Android 8+
    allowMixedContent: false,
    captureInput: true,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
