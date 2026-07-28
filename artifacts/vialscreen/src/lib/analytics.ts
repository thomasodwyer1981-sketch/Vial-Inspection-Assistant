/**
 * PepScan — Analytics
 *
 * Thin wrapper around PostHog for product analytics.
 * Gates on VITE_POSTHOG_KEY — completely no-op without it,
 * so builds without the key work fine in dev and CI.
 *
 * To enable:
 *   1. Create a free project at https://posthog.com
 *   2. Copy the Project API Key (starts with phc_…)
 *   3. Add it as VITE_POSTHOG_KEY in Replit Secrets
 *
 * All events are anonymous — no user PII is ever sent.
 * We never send peptide names, vendor names, or scan images.
 */

import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = 'https://eu.i.posthog.com'; // EU data residency

let _ready = false;

export function initAnalytics() {
  if (!KEY) return;
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: 'never',        // fully anonymous — no user profiles created
    autocapture: false,               // manual events only — we control exactly what is tracked
    capture_pageview: false,          // SPA — we fire page views manually
    capture_pageleave: false,
    disable_session_recording: true,  // no replays
    persistence: 'localStorage',
  });
  _ready = true;
}

/** Fire an anonymous product analytics event. */
export function track(event: string, properties?: Record<string, unknown>) {
  if (!_ready) return;
  posthog.capture(event, { ...properties, app: 'pepscan' });
}

// ── Named event helpers ─────────────────────────────────────────────────────
// These are the only places where we define what is and is not tracked.
// Never add peptide names, vendor names, OCR text, or any user-typed content.

/** User completed onboarding / accepted disclaimer. */
export function trackOnboardingComplete() {
  track('onboarding_complete');
}

/** User reached the scan prepare step. */
export function trackScanStarted(scanMode: string) {
  track('scan_started', { scan_mode: scanMode });
}

/** User selected an appearance profile. */
export function trackProfileSelected(profile: string, isPro: boolean) {
  track('profile_selected', { profile, is_pro: isPro });
}

/** User selected a reconstitution time. */
export function trackReconstitutionTimeSet(value: string) {
  track('reconstitution_time_set', { value });
}

/** Analysis completed — the most important event. */
export function trackScanComplete(params: {
  verdict: string;
  confidence: number;
  profile: string | null;
  scanMode: string;
  aiEnhanced: boolean;
  hasBaseline: boolean;
  reconstitutedAt: string | null | undefined;
}) {
  track('scan_complete', {
    verdict: params.verdict,
    confidence_band:
      params.confidence >= 80 ? 'high'
      : params.confidence >= 50 ? 'medium'
      : 'low',
    profile: params.profile ?? 'none',
    scan_mode: params.scanMode,
    ai_enhanced: params.aiEnhanced,
    has_baseline: params.hasBaseline,
    reconstituted_at: params.reconstitutedAt ?? 'not_set',
  });
}

/** User shared a result (PDF or image card). */
export function trackShare(format: 'pdf' | 'card', verdict: string) {
  track('result_shared', { format, verdict });
}

/** User opened history detail for a past scan. */
export function trackHistoryViewed() {
  track('history_detail_viewed');
}

/** User upgraded to Pro. */
export function trackProUpgrade(source: string) {
  track('pro_upgrade', { source });
}

/** User hit the storage quota warning. */
export function trackStorageQuotaWarning() {
  track('storage_quota_warning');
}
