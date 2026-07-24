/**
 * PepScan — Haptic feedback helpers.
 *
 * Thin wrappers around @capacitor/haptics that silently no-op when haptics
 * are unavailable (web browsers, desktop). Never throws.
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/** Light tap — shutter press, button acknowledgements. */
export async function hapticLight(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Haptics unavailable (web/desktop) — ignore
  }
}

/** Success buzz — analysis finished with a PASS verdict. */
export async function hapticSuccess(): Promise<void> {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // ignore
  }
}

/** Warning buzz — REVIEW or DO NOT USE verdict. */
export async function hapticWarning(): Promise<void> {
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    // ignore
  }
}
