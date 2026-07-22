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

/** Report an exception from anywhere in the app */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}
