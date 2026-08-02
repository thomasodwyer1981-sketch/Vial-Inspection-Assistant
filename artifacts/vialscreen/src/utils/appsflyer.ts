import { Capacitor } from '@capacitor/core';

const OPT_OUT_KEY = 'vialscreen:analyticsOptOut';

/** Returns true if the user has opted out of in-app analytics events. */
export function getAnalyticsOptOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Persist the user's analytics opt-out preference. */
export function setAnalyticsOptOut(optOut: boolean): void {
  try {
    if (optOut) {
      localStorage.setItem(OPT_OUT_KEY, 'true');
    } else {
      localStorage.removeItem(OPT_OUT_KEY);
    }
  } catch {
    // localStorage unavailable — silently ignore
  }
}

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
 * Silently no-ops on web, before init, or when the user has opted out.
 */
export async function logAFEvent(
  eventName: string,
  eventValues?: Record<string, string | number | boolean>,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (getAnalyticsOptOut()) return; // respect GDPR Article 21 objection
  try {
    const { AppsFlyer } = await import('appsflyer-capacitor-plugin');
    await AppsFlyer.logEvent({ eventName, eventValue: eventValues ?? {} });
  } catch (err) {
    console.error('[AppsFlyer] logEvent failed:', err);
  }
}
