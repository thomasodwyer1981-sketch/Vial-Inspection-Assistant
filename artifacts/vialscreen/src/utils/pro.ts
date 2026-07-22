/**
 * VialScreen Pro — client-side pro status utilities.
 *
 * Pro status is verified server-side on mount and cached locally for 1 hour.
 * The membership ID itself is stored in localStorage, but is always
 * re-validated with the server before granting access.
 */

export const FREE_HISTORY_LIMIT = 10;
export const PRO_PRICE_DISPLAY = '$4.99';

const STORAGE_KEY = 'vialscreen:pro:membershipId';
const CACHE_KEY = 'vialscreen:pro:verifiedAt';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function getStoredMembershipId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeProUnlock(membershipId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, membershipId);
    localStorage.setItem(CACHE_KEY, Date.now().toString());
  } catch {
    // ignore storage errors
  }
}

export function clearProStatus(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

/** True if the cached verification is still fresh (< 1 hour old). */
export function isVerificationCacheFresh(): boolean {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

export function refreshVerificationCache(): void {
  try {
    localStorage.setItem(CACHE_KEY, Date.now().toString());
  } catch {
    // ignore
  }
}

/** Build the full redirect URL for after Whop checkout completes. */
export function buildUpgradeCompleteUrl(): string {
  // Use Vite's BASE_URL (the app's configured base path, e.g. /vialscreen/)
  // rather than window.location.pathname, which includes the current page
  // and would produce paths like /vialscreen/upgrade/upgrade-complete (wrong).
  const base = (import.meta.env.BASE_URL as string).replace(/\/$/, '');
  return `${window.location.origin}${base}/upgrade-complete`;
}
