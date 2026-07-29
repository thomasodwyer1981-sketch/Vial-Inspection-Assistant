import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  getStoredMembershipId,
  isVerificationCacheFresh,
  refreshVerificationCache,
  clearProStatus,
  storeProUnlock,
} from '@/utils/pro';
import { getApiBase } from '@/utils/api';
import { checkRCEntitlement } from '@/utils/revenuecat';

interface ProStatus {
  isPro: boolean;
  isLoading: boolean;
  membershipId: string | null;
  /** Re-verify with the server, bypassing cache. */
  recheck: () => Promise<void>;
}

/**
 * @param failOpen - true (default) means a network error keeps existing Pro access;
 *   false means a network error is treated as not-verified (used for first-time activation
 *   so an offline device can't bootstrap Pro with a fake membership ID).
 */
async function verifyWithServer(membershipId: string, failOpen = true): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBase()}/api/whop/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipId }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { verified: boolean };
    return data.verified === true;
  } catch {
    // Network error — behaviour depends on context:
    // • Re-checks for existing users fail open (don't revoke access when server unreachable)
    // • First-time activation fails closed (require successful server confirmation)
    return failOpen;
  }
}

/**
 * Returns the user's current Pro status.
 *
 * On native (Capacitor/Android): checks RevenueCat entitlement via Google Play Billing.
 * On web: reads the stored Whop membership ID and verifies server-side (cached 1 hr).
 */
export function useProStatus(): ProStatus {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [membershipId, setMembershipId] = useState<string | null>(null);

  const verify = useCallback(async (force = false) => {
    // ── Native path: use RevenueCat / Google Play Billing ──
    if (Capacitor.isNativePlatform()) {
      setIsLoading(true);
      try {
        const active = await checkRCEntitlement();
        setIsPro(active);
        setMembershipId(active ? 'rc_entitlement' : null);
      } catch {
        setIsPro(false);
        setMembershipId(null);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // ── Web path: use Whop membership ID ──
    const stored = getStoredMembershipId();

    if (!stored) {
      setIsPro(false);
      setMembershipId(null);
      setIsLoading(false);
      return;
    }

    // Use cached result if fresh and not forced
    if (!force && isVerificationCacheFresh()) {
      setIsPro(true);
      setMembershipId(stored);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const verified = await verifyWithServer(stored);

    if (verified) {
      refreshVerificationCache();
      setIsPro(true);
      setMembershipId(stored);
    } else {
      // Membership revoked or invalid — clear stored unlock
      clearProStatus();
      setIsPro(false);
      setMembershipId(null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void verify();
  }, [verify]);

  // Re-verify whenever the user returns to the app — covers the case where
  // someone completes a Play Store purchase in a browser overlay and comes back.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void verify(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [verify]);

  const recheck = useCallback(() => verify(true), [verify]);

  return { isPro, isLoading, membershipId, recheck };
}

/**
 * Verify a brand-new Whop membership ID (called from UpgradeCompleteScreen).
 * Returns true if verified, stores the unlock if so.
 * Web-only — native uses RevenueCat.
 */
export async function activateProUnlock(membershipId: string): Promise<boolean> {
  // Fail closed for first-time activation — network must succeed
  const verified = await verifyWithServer(membershipId, false);
  if (verified) {
    storeProUnlock(membershipId);
  }
  return verified;
}
