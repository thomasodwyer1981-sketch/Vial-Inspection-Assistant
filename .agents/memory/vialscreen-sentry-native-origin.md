---
name: PepScan native Sentry delivery
description: Why localhost filtering must distinguish native Capacitor WebViews from browser development
---

**Rule:** Never drop Sentry events solely because `window.location.hostname` is
`localhost`; allow that origin whenever Capacitor reports a native platform.
For save failures and similarly critical diagnostics, queue the event and wait
for a bounded flush before enabling retry or navigation actions.

**Why:** Capacitor serves bundled iOS and Android assets from a localhost origin.
A browser-oriented localhost filter silently discarded genuine on-device
events, including confirmed iPhone storage failures.

**How to apply:** Any future Sentry filtering must consider both hostname and
native-platform status. Critical failure UI should preserve user data
immediately, then hold competing actions only for a short, bounded flush.