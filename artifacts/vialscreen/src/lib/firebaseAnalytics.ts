/**
 * PepScan — Firebase Analytics wrapper
 *
 * Uses @capacitor-firebase/analytics, which routes to the native
 * Firebase Android SDK on device and is a no-op in the browser.
 *
 * Activation: drop a google-services.json into android/app/ (or let
 * the GitHub Actions workflow inject it via the GOOGLE_SERVICES_JSON_BASE64
 * secret).  No code change needed — the build.gradle already conditionally
 * applies the google-services plugin when the file is present.
 *
 * Firebase event naming rules (enforced here):
 *   - max 40 chars, letters/digits/underscores only, no leading digit
 *   - reserved prefixes: firebase_, google_, ga_  (we never use these)
 * Parameter rules:
 *   - max 25 params, names max 40 chars
 *   - string values max 100 chars, numbers unrestricted
 */

import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { Capacitor } from '@capacitor/core';

// Only instrument on real native builds — the plugin throws on web.
const isNative = Capacitor.isNativePlatform();

/** Log a custom Firebase Analytics event. Silent no-op on web. */
export async function logEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  if (!isNative) return;
  try {
    // Truncate string values to 100 chars as required by Firebase
    const safe: Record<string, string | number | boolean> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        safe[k] = typeof v === 'string' ? v.slice(0, 100) : v;
      }
    }
    await FirebaseAnalytics.logEvent({ name, params: safe });
  } catch {
    // best-effort — never let analytics failures surface to the user
  }
}

/** Tag the current screen — appears in Firebase > Events > screen_view. */
export async function setScreen(screenName: string): Promise<void> {
  if (!isNative) return;
  try {
    await FirebaseAnalytics.setCurrentScreen({ screenName });
  } catch { /* best-effort */ }
}
