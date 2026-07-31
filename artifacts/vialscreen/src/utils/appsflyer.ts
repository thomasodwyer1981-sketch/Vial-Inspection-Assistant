import { Capacitor } from '@capacitor/core';

let initialised = false;

/**
 * Initialise the AppsFlyer SDK.
 * Safe to call multiple times — only runs once.
 * No-ops on web (where the native plugin is unavailable).
 */
export async function initAppsFlyer(): Promise<void> {
  if (initialised) return;
  if (!Capacitor.isNativePlatform()) return;

  const devKey = import.meta.env.VITE_APPSFLYER_DEV_KEY as string | undefined;
  if (!devKey) {
    console.warn('[AppsFlyer] VITE_APPSFLYER_DEV_KEY not set — skipping init');
    return;
  }

  try {
    const { AppsFlyer } = await import('appsflyer-capacitor-plugin');
    await AppsFlyer.initSDK({
      appID: 'com.pepscan.app',
      devKey,
      isDebug: false,
      waitForATTUserAuthorization: 10, // seconds (iOS ATT prompt grace period)
      registerOnDeepLink: true,
      registerConversionListener: true,
    });
    initialised = true;
    console.log('[AppsFlyer] SDK initialised');
  } catch (err) {
    console.error('[AppsFlyer] Init failed:', err);
  }
}

/**
 * Log a custom in-app event to AppsFlyer.
 * Silently no-ops on web or before init.
 */
export async function logAFEvent(
  eventName: string,
  eventValues?: Record<string, string | number | boolean>,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { AppsFlyer } = await import('appsflyer-capacitor-plugin');
    await AppsFlyer.logEvent({ eventName, eventValue: eventValues ?? {} });
  } catch (err) {
    console.error('[AppsFlyer] logEvent failed:', err);
  }
}
