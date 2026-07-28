/**
 * Sentry error monitoring — initialised once at app startup.
 *
 * Set VITE_SENTRY_DSN in your environment (Replit Secrets + GitHub Actions
 * secret) to enable reporting.  When the DSN is absent the module is a no-op
 * so local dev and CI builds without the secret work fine.
 *
 * How to get a DSN:
 *   1. Create a free account at https://sentry.io
 *   2. New Project → Capacitor
 *   3. Copy the DSN from the onboarding screen or
 *      Settings → Projects → <project> → Client Keys (DSN)
 */

import * as Sentry from '@sentry/capacitor';
import * as SentryReact from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry() {
  if (!dsn) {
    // No DSN configured — skip silently (dev / build without secret)
    return;
  }

  Sentry.init(
    {
      dsn,
      // Capture 100 % of errors; sample 20 % of performance traces
      tracesSampleRate: 0.2,
      // Release tag helps correlate errors to a specific build
      release: import.meta.env.VITE_APP_VERSION ?? 'dev',
      environment: import.meta.env.MODE, // "development" | "production"
      // Don't send errors from localhost
      beforeSend(event) {
        if (window.location.hostname === 'localhost') return null;
        return event;
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SentryReact.init as any,
  );
}

/**
 * Tag the current Sentry scope with the result of the most recent scan.
 * Any error that occurs after a scan (e.g. during share, save, or history)
 * will now carry this context, making triage much faster.
 */
export function setScanContext(params: {
  verdict: string;
  profile: string | null;
  confidence: number;
  aiEnhanced: boolean;
  scanMode: string;
}) {
  if (!dsn) return;
  Sentry.withScope((scope) => {
    scope.setTag('scan.verdict', params.verdict);
    scope.setTag('scan.profile', params.profile ?? 'none');
    scope.setTag('scan.mode', params.scanMode);
    scope.setContext('last_scan', {
      verdict: params.verdict,
      profile: params.profile,
      confidence: params.confidence,
      ai_enhanced: params.aiEnhanced,
      scan_mode: params.scanMode,
    });
  });
}

/** Report an exception from anywhere in the app */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

/**
 * Record a breadcrumb — a step in a user flow visible in Sentry under each
 * error or message event.  Use for key UI transitions so when something goes
 * wrong you can see the sequence of steps that led there.
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info',
) {
  if (!dsn) return;
  Sentry.addBreadcrumb({ message, data, level, timestamp: Date.now() / 1000 });
}

/**
 * Send a non-error diagnostic message to Sentry.
 * Use for silent failures and performance warnings that are not exceptions.
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'warning',
  context?: Record<string, unknown>,
) {
  if (!dsn) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureMessage(message, level);
  });
}

/**
 * Instrument a capture attempt.
 *
 * Returns a finish() function to call when the capture ends.
 * - Records a breadcrumb at start.
 * - On finish: records outcome breadcrumb.
 * - If the attempt took > SLOW_THRESHOLD_MS, sends a Sentry warning so slow
 *   or stuck captures surface in the dashboard automatically.
 *
 * Usage:
 *   const finish = startCaptureTrace('white', 'LiveCameraCapture.runBurst');
 *   // ... do capture work ...
 *   finish('success');   // or finish('failed', err)
 */
const SLOW_CAPTURE_THRESHOLD_MS = 5000;

export function startCaptureTrace(background: string, where: string) {
  const t0 = Date.now();
  addBreadcrumb(`Capture started`, { background, where });

  return function finish(outcome: 'success' | 'failed' | 'aborted', err?: unknown) {
    const elapsed = Date.now() - t0;
    addBreadcrumb(`Capture ${outcome}`, { background, where, elapsed_ms: elapsed }, outcome === 'failed' ? 'error' : 'info');

    if (outcome === 'failed' && err) {
      captureError(err, { where, background, elapsed_ms: elapsed });
    }

    // Surface slow captures even when they don't throw — this is exactly the
    // class of silent failures that caused repeated missed bugs.
    if (elapsed > SLOW_CAPTURE_THRESHOLD_MS && outcome !== 'aborted') {
      captureMessage(
        `Slow capture: ${outcome} after ${elapsed} ms`,
        'warning',
        { background, where, elapsed_ms: elapsed, outcome },
      );
    }
  };
}
