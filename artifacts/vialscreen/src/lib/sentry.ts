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
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const bundledAppVersion = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'unknown';
const bundledAppBuild = (import.meta.env.VITE_APP_BUILD as string | undefined) ?? 'unknown';
// The Replit preview runs on a public dev domain, not localhost. Reporting
// from it turns Vite/React Fast Refresh transitions into false production
// alerts, while compiled mobile builds use production mode and remain covered.
const sentryEnabled = Boolean(dsn) && !import.meta.env.DEV;
const isNativePlatform = Capacitor.isNativePlatform();
const SAVE_FAILURE_FLUSH_TIMEOUT_MS = 2_000;

interface AppDiagnosticInfo {
  version: string;
  build: string;
}

let appDiagnosticInfoPromise: Promise<AppDiagnosticInfo> | null = null;

function getAppDiagnosticInfo(): Promise<AppDiagnosticInfo> {
  if (!appDiagnosticInfoPromise) {
    appDiagnosticInfoPromise = isNativePlatform
      ? App.getInfo()
          .then((info) => ({ version: info.version, build: info.build }))
          .catch(() => ({ version: bundledAppVersion, build: bundledAppBuild }))
      : Promise.resolve({ version: bundledAppVersion, build: bundledAppBuild });
  }
  return appDiagnosticInfoPromise;
}

export function shouldDropSentryEvent(hostname: string, nativePlatform: boolean): boolean {
  return hostname === 'localhost' && !nativePlatform;
}

export function initSentry() {
  if (!sentryEnabled) {
    // Skip development previews and builds without a DSN.
    return;
  }

  Sentry.init(
    {
      dsn,
      // Capture 100 % of errors; sample 20 % of performance traces
      tracesSampleRate: 0.2,
      // Release tag helps correlate errors to a specific build
      release: bundledAppBuild === 'unknown'
        ? bundledAppVersion
        : `pepscan@${bundledAppVersion}+${bundledAppBuild}`,
      environment: import.meta.env.MODE, // "development" | "production"
      // Capacitor serves bundled iOS/Android assets from a localhost origin.
      // Suppress only a real browser localhost build, never a native WebView.
      beforeSend(event) {
        if (shouldDropSentryEvent(window.location.hostname, isNativePlatform)) return null;
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
  if (!sentryEnabled) return;
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
  if (!sentryEnabled) return;
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
  if (!sentryEnabled) return;
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
  if (!sentryEnabled) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureMessage(message, level);
  });
}

export async function captureSaveFailureDiagnostic(context: {
  stage: string;
  kind: string;
  errorName: string;
  storageChars: number;
}): Promise<boolean> {
  if (!sentryEnabled) return false;

  const appInfo = await getAppDiagnosticInfo();
  Sentry.withScope((scope) => {
    scope.setTag('save.stage', context.stage);
    scope.setTag('save.kind', context.kind);
    scope.setTag('app.version', appInfo.version);
    scope.setTag('app.build', appInfo.build);
    scope.setExtras({
      stage: context.stage,
      kind: context.kind,
      error_name: context.errorName,
      pepscan_storage_chars: context.storageChars,
      app_version: appInfo.version,
      app_build: appInfo.build,
      platform: Capacitor.getPlatform(),
    });
    Sentry.captureMessage('Inspection record save failed', 'error');
  });

  try {
    return await Sentry.flush(SAVE_FAILURE_FLUSH_TIMEOUT_MS);
  } catch {
    return false;
  }
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
/**
 * Time an async operation and surface it as a Sentry performance span.
 * If performance monitoring is not initialised (no DSN / sample rate = 0)
 * the function runs normally — no overhead.
 *
 * Usage:
 *   const result = await withSpan('analysis', 'heuristic_engine', () => runAnalysis(...));
 */
export async function withSpan<T>(
  op: string,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!sentryEnabled) return fn();
  return Sentry.startSpan({ op, name }, () => fn());
}

/**
 * Add a breadcrumb that marks a scan wizard step transition.
 * These show up in the Sentry event trail so you can see exactly
 * where in the flow an error (or a slow AI call) occurred.
 */
export function breadcrumbStep(step: string, direction: 'enter' | 'exit' = 'enter') {
  addBreadcrumb(`Scan step: ${step} (${direction})`, { step, direction }, 'info');
}

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
