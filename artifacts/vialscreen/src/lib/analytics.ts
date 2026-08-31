/**
 * PepScan — Analytics
 *
 * Thin wrapper around Firebase Analytics (@capacitor-firebase/analytics).
 * Events are only sent on native Android builds; all calls are no-ops in
 * the browser dev server.  No API key or environment variable required —
 * activation happens automatically when google-services.json is present
 * in android/app/ at build time.
 *
 * All events are anonymous — no user PII is ever sent.
 * We never send peptide names, vendor names, batch numbers, or scan images.
 *
 * Firebase event naming rules:
 *   max 40 chars, letters/digits/underscores, no reserved prefixes (firebase_, google_, ga_)
 */

import { logEvent } from './firebaseAnalytics';

// Re-export initAnalytics as a no-op — called from main.tsx, harmless.
export function initAnalytics() {
  // Firebase Analytics initialises automatically via the native SDK.
  // Nothing to do here; the function exists so main.tsx doesn't need to change.
}

// ── Named event helpers ─────────────────────────────────────────────────────

/** User completed onboarding / accepted disclaimer. */
export function trackOnboardingComplete() {
  void logEvent('onboarding_complete');
}

/** User reached the scan prepare step. */
export function trackScanStarted(scanMode: string) {
  void logEvent('scan_started', { scan_mode: scanMode });
}

/** User selected an appearance profile. */
export function trackProfileSelected(profile: string, isPro: boolean) {
  void logEvent('profile_selected', { profile, is_pro: isPro ? 1 : 0 });
}

/** User selected a reconstitution time. */
export function trackReconstitutionTimeSet(value: string) {
  void logEvent('recon_time_set', { value });
}

/**
 * Analysis completed — the most important event.
 * Confidence is bucketed (not raw) so we can't reverse-engineer individual scans.
 */
export function trackScanComplete(params: {
  verdict: string;
  confidence: number;
  profile: string | null;
  scanMode: string;
  aiEnhanced: boolean;
  hasBaseline: boolean;
  reconstitutedAt: string | null | undefined;
}) {
  void logEvent('scan_complete', {
    verdict: params.verdict,
    confidence_band:
      params.confidence >= 80 ? 'high'
      : params.confidence >= 50 ? 'medium'
      : 'low',
    profile: params.profile ?? 'none',
    scan_mode: params.scanMode,
    ai_enhanced: params.aiEnhanced ? 1 : 0,
    has_baseline: params.hasBaseline ? 1 : 0,
    recon_at: params.reconstitutedAt ?? 'not_set',
  });
}

/** User shared a result (PDF or image card). */
export function trackShare(format: 'pdf' | 'card', verdict: string) {
  void logEvent('result_shared', { format, verdict });
}

/** User opened history detail for a past scan. */
export function trackHistoryViewed() {
  void logEvent('history_detail_viewed');
}

/** User upgraded to Pro. */
export function trackProUpgrade(source: string) {
  void logEvent('pro_upgrade', { source });
}

/** User saw a Pro offer. Source is a non-sensitive UI location. */
export function trackProOfferViewed(source: string) {
  void logEvent('pro_offer_viewed', { source });
}

/** User initiated the one-time native or web Pro purchase flow. */
export function trackProPurchaseAttempt(source: string) {
  void logEvent('pro_purchase_attempt', { source });
}

/** A one-time Pro purchase activated the entitlement. */
export function trackProPurchaseComplete(source: string) {
  void logEvent('pro_purchase_complete', { source });
}

/** User asked the native store to restore a previous Pro purchase. */
export function trackProRestoreAttempt(source: string) {
  void logEvent('pro_restore_attempt', { source });
}

/** User requested a restore and the entitlement became active. */
export function trackProRestoreComplete(source: string) {
  void logEvent('pro_restore_complete', { source });
}

/** Whether the optional enhanced visual review completed or fell back locally. */
export function trackEnhancedReview(result: 'completed' | 'local_only') {
  void logEvent('enhanced_review_status', { result });
}

/** User started a new inspection from an existing saved record. */
export function trackRepeatInspectionStarted(scanMode: string) {
  void logEvent('repeat_inspection_started', { scan_mode: scanMode });
}

/** User hit the storage quota warning. */
export function trackStorageQuotaWarning() {
  void logEvent('storage_quota_warning');
}
