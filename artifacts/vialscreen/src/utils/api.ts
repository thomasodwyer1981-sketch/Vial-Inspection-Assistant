/**
 * PepScan — API base URL utility.
 *
 * Returns the correct API root for the current build context:
 *  - Web (dev):        '' → proxied by Vite to localhost:8080
 *  - Web (deployed):   '' → same domain, Replit routes /api to the API service
 *  - Capacitor/native: uses VITE_API_BASE_URL set at build time (e.g. https://pepscan.replit.app)
 */
export function getApiBase(): string {
  const override = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (override) return override.replace(/\/$/, '');
  return import.meta.env.BASE_URL.replace(/\/$/, '');
}
