/**
 * RevenueCat integration — native (Capacitor) only.
 *
 * Android uses Google Play Billing (VITE_REVENUECAT_API_KEY — goog_ prefix).
 * iOS uses App Store Billing (VITE_REVENUECAT_IOS_KEY — appl_ prefix).
 * Web users go through Whop instead.
 *
 * RC_ENTITLEMENT_ID must match the entitlement identifier in the RevenueCat
 * dashboard (Project → Entitlements → identifier column, NOT the display name).
 */

import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

/** Must match RevenueCat dashboard entitlement identifier exactly. */
export const RC_ENTITLEMENT_ID = 'Pepscan Pro';

let initialized = false;

/**
 * Select only RevenueCat's lifetime package. Kept pure so the store contract
 * can be regression-tested without opening a native billing sheet.
 */
export function selectOneTimePackage<T extends { packageType?: unknown }>(
  offering: {
    lifetime?: T | null;
    availablePackages?: readonly T[];
  } | null | undefined,
): T | null {
  return (
    offering?.lifetime ??
    offering?.availablePackages?.find((candidate) => candidate.packageType === 'LIFETIME') ??
    null
  );
}

export async function initRevenueCat(): Promise<void> {
  if (!Capacitor.isNativePlatform() || initialized) return;

  const platform = Capacitor.getPlatform(); // 'ios' | 'android'
  const iosKey = import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined;
  const androidKey = import.meta.env.VITE_REVENUECAT_API_KEY as string | undefined;
  const apiKey = platform === 'ios' ? iosKey : androidKey;

  if (!apiKey) {
    console.warn(`[RevenueCat] API key not set for platform: ${platform}`);
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
    // Fail closed — deny on error to avoid granting Pro for free during outages
    return false;
  }
}

/**
 * Triggers the native store purchase sheet for the lifetime one-time package.
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
    // Capacitor bridge rejections often drop RC's custom fields — fall back
    // through every place the human-readable reason can live.
    const readable =
      (typeof err?.readableErrorCode === 'string' && err.readableErrorCode) ||
      (typeof err?.underlyingErrorMessage === 'string' && err.underlyingErrorMessage) ||
      (typeof err?.errorMessage === 'string' && err.errorMessage) ||
      (e instanceof Error ? e.message : '') ||
      '';
    const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY as string ?? '';
    const keyHint = apiKey ? apiKey.slice(0, 12) + '…' : 'not set';
    throw new Error(
      `RC error ${code} (${readable})\nKey: ${keyHint}\nIf credentials were recently updated in Play Console, allow up to 24 hours for propagation, then retry.`,
    );
  }

  const current = offerings?.current;

  // Both stores must use the lifetime package. Never fall back to an annual
  // or arbitrary custom package: doing so can silently turn a one-time
  // purchase into a recurring subscription.
  const pkg = selectOneTimePackage(current);
  if (!pkg) {
    console.error('[RevenueCat] No packages in offering:', JSON.stringify(offerings));
    throw new Error(
      'PepScan Pro is not configured for this store yet. Add the lifetime one-time product to the default RevenueCat offering, then try again.',
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
 * Returns the localized price string for the Pro lifetime package (e.g. "$4.99") from
 * RevenueCat. Returns null on web or if the offering cannot be fetched.
 */
export async function getProPrice(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    await initRevenueCat();
    const offerings = await Purchases.getOfferings();
    const current = offerings?.current;
    const pkg = selectOneTimePackage(current);
    // RevenueCat exposes the store-formatted price string on the product object
    const price = (pkg?.product as Record<string, unknown> | undefined)?.priceString;
    return typeof price === 'string' && price.length > 0 ? price : null;
  } catch {
    return null;
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
