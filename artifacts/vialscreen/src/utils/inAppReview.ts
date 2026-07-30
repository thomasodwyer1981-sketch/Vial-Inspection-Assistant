import { Capacitor } from '@capacitor/core';

const PASS_COUNT_KEY = 'vialscreen:review_pass_count';
const LAST_PROMPTED_KEY = 'vialscreen:review_prompted_at';
const LAST_SESSION_KEY = 'vialscreen:review_last_session';
const MIN_PASSES = 3;          // trigger after 3rd PASS result
const MIN_DAYS_BETWEEN = 14;   // never more than once per 14 days

/**
 * Call after every PASS triage result, passing the session ID.
 * Deduplicates by session so navigating back to results doesn't inflate the count.
 * Fires the native In-App Review dialog when conditions are met.
 * Silently no-ops on web or if conditions aren't met.
 */
export async function maybeRequestReview(sessionId?: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Deduplicate — only count each unique session once
  if (sessionId) {
    const lastSeen = localStorage.getItem(LAST_SESSION_KEY);
    if (lastSeen === sessionId) return;
    localStorage.setItem(LAST_SESSION_KEY, sessionId);
  }

  // Increment pass counter
  const prev = parseInt(localStorage.getItem(PASS_COUNT_KEY) ?? '0', 10) || 0;
  const count = prev + 1;
  localStorage.setItem(PASS_COUNT_KEY, String(count));

  if (count < MIN_PASSES) return;

  // Throttle: at most once per MIN_DAYS_BETWEEN days
  const lastTs = localStorage.getItem(LAST_PROMPTED_KEY);
  if (lastTs) {
    const daysSince = (Date.now() - parseInt(lastTs, 10)) / 86_400_000;
    if (daysSince < MIN_DAYS_BETWEEN) return;
  }

  try {
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
    localStorage.setItem(LAST_PROMPTED_KEY, String(Date.now()));
  } catch {
    // Non-critical — silently suppress. Google/Apple throttle on their end too.
  }
}
