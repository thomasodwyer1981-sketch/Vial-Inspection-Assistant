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

  const offerings = await Purchases.getOfferings();
  const current = offerings?.current;

  // Prefer the lifetime package; fall back to the first available package
  const pkg = current?.lifetime ?? current?.availablePackages?.[0] ?? null;
  if (!pkg) {
    throw new Error(
      'No packages found in RevenueCat. Make sure you have a product linked to an offering.',
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
