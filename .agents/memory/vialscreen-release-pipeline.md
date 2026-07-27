---
name: VialScreen Android release pipeline gotchas
description: Launch-crash from mixed Sentry native versions, how to verify an AAB's contents, and Google Play track opt-in traps
---

# Android release pipeline gotchas (PepScan)

## Mixed Sentry native versions = instant crash on launch
**Rule:** With `@sentry/capacitor`, never declare `io.sentry:sentry-android` explicitly in `app/build.gradle`, and always set `autoInstallation { enabled = false }` in the `sentry {}` gradle-plugin block.
**Why:** `@sentry/capacitor` pins its own `sentry-android` (e.g. 8.41.0). An explicit dep at another version and/or the Sentry gradle plugin's autoInstallation injects companion modules (`sentry-android-fragment`, `sentry-kotlin-extensions`) at the plugin's default version (8.13.0). Two mixed Sentry versions in one APK abort at process start — before the first frame renders and before Sentry can send anything, so the crash is invisible in Sentry. A CI guard step in the AAB workflow now fails the build if mixed io.sentry versions are packaged.
**How to apply:** After any Sentry/Capacitor upgrade, check packaged versions in the AAB: `unzip app-release.aab; strings BUNDLE-METADATA/com.android.tools.build.libraries/dependencies.pb | grep -A2 sentry` — every io.sentry module must be the same version.

## Verifying what code an AAB actually contains
An AAB is a zip. Web assets live at `base/assets/public/assets/*.js`. Grep for a feature-specific string literal (e.g. `countdown`, a Terms heading) to prove a feature is in the bundle; grep `base/manifest/AndroidManifest.xml` for the versionName string. Download CI artifacts with `gh run download <runId> -n pepscan-release`. This settles "is it a build problem or a delivery problem" in one step.

## Google Play track opt-in traps
A phone only receives updates from the track its tester account is opted into. Uploading a new build to Closed/Alpha does nothing for a phone enrolled in Internal testing — it keeps reinstalling the old version, which looks like "updates not applied". Internal track releases go live near-instantly; open testing and production go through review and auto-roll-out on approval. When a bad build is out: upload the fixed higher versionCode to the same tracks (it supersedes a pending/live release); discard in-review releases where the option exists; halt rollout if already live.
