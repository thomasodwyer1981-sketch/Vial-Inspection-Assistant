/**
 * RevenueCat integration — native (Capacitor) only.
 *
 * Used for Google Play Billing on Android. Web users go through Whop instead.
 *
 * RC_ENTITLEMENT_ID must match the entitlement identifier in the RevenueCat
 * dashboard (Project → Entitlements → identifier column, NOT the display name).
 */

import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

/** Must match RevenueCat dashboard entitlement identifier exactly. */
export const RC_ENTITLEMENT_ID = 'Pepscan Pro';

let initialized = false;

export async function initRevenueCat(): Promise<void> {
  if (!Capacitor.isNativePlatform() || initialized) return;

  const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY as string | undefined;
  if (!apiKey) {
    console.warn('[RevenueCat] VITE_REVENUECAT_API_KEY not set');
    return;
  }

  await Purchases.configure({ apiKey });
  initialized = true;
}

/** Returns true if the user has an active Pro entitlement in RevenueCat. */
export async function checkRCEntitlement(): Promise<boolean> {
  try {
    await initRevenueCat();
    const { customerInfo } = await Purchases.getCustomerInfo();
    return RC_ENTITLEMENT_ID in customerInfo.entitlements.active;
  } catch (e) {
    console.warn('[RevenueCat] entitlement check failed:', e);
    // Fail open — don't lock out users due to a transient RC error
    return false;
  }
}

/**
 * Triggers the Google Play purchase sheet for the lifetime/one-time package.
 * Returns true if purchase succeeded and entitlement is now active.
 * Returns false if user cancelled.
 * Throws on any other error.
 */
export async function purchaseRCPro(): Promise<boolean> {
  await initRevenueCat();

  let offerings;
  try {
    offerings = await Purchases.getOfferings();
  } catch (e: unknown) {
    const err = e as Record<string, unknown>;
    console.error('[RevenueCat] getOfferings failed:', JSON.stringify(err));
    const code = err?.code ?? '';
    const readable = err?.readableErrorCode ?? err?.underlyingErrorMessage ?? '';
    const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY as string ?? '';
    const keyHint = apiKey ? apiKey.slice(0, 12) + '…' : 'not set';
    throw new Error(
      `RC error ${code} (${readable})\nKey: ${keyHint}\nInstall from Play Store testing track and add Gmail to licence testers in Play Console.`,
    );
  }

  const current = offerings?.current;

  // Prefer the lifetime package; fall back to the first available package
  const pkg = current?.lifetime ?? current?.availablePackages?.[0] ?? null;
  if (!pkg) {
    console.error('[RevenueCat] No packages in offering:', JSON.stringify(offerings));
    throw new Error(
      'No packages found in RevenueCat offering. Check that the lifetime product is attached to the default offering in the RC dashboard.',
    );
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return RC_ENTITLEMENT_ID in customerInfo.entitlements.active;
  } catch (e: unknown) {
    const err = e as Record<string, unknown>;
    // User cancelled — not an error
    if (err?.userCancelled === true || err?.code === 'PURCHASE_CANCELLED') {
      return false;
    }
    console.error('[RevenueCat] purchasePackage failed:', JSON.stringify(err));
    throw e;
  }
}

/**
 * Restores previous Play Store purchases.
 * Returns true if a Pro entitlement was restored.
 */
export async function restoreRCPurchases(): Promise<boolean> {
  try {
    await initRevenueCat();
    const { customerInfo } = await Purchases.restorePurchases();
    return RC_ENTITLEMENT_ID in customerInfo.entitlements.active;
  } catch (e) {
    console.warn('[RevenueCat] restore failed:', e);
    throw e;
  }
}
