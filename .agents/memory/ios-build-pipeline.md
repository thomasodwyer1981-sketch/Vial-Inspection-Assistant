---
name: iOS build pipeline
description: Signing approach, SPM cascade root cause, iOS 26 NSCoding crash, required secrets.
---

## Signing approach

Release target build settings (baked into project.pbxproj — do NOT pass as CLI flags; CLI flags cascade to SPM packages and break signing):
- `CODE_SIGN_STYLE = Manual`, `CODE_SIGN_IDENTITY = "Apple Distribution"`, `PROVISIONING_PROFILE_SPECIFIER = "PepScan App Store"`, `DEVELOPMENT_TEAM = B6PJBT97RS`

With `destination=upload`, xcodebuild uploads directly to App Store Connect. No local export folder is written — do not assert that directory exists.

**SPM cascade rule:** Import a provisioning profile into `~/Library/MobileDevice/Provisioning Profiles/` only AFTER archive completes. Importing before archive causes Xcode to apply the profile to all SPM package targets, which do not support provisioning → signing errors on every library target.

## Secrets required
`APPLE_CERTIFICATE_BASE64`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_PROVISIONING_PROFILE_BASE64`, `APP_STORE_CONNECT_KEY_BASE64`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `GOOGLESERVICE_INFO_PLIST_BASE64`.

`GOOGLESERVICE_INFO_PLIST_BASE64` is a runtime requirement while the native Firebase Analytics plugin is installed: its plugin registration calls `FirebaseApp.configure()` during launch, and a missing/placeholder plist aborts the app before UI appears. CI must not treat it as optional.

## App Store / App ID
Apple ID: **6795666262** | Bundle ID: `com.pepscan.app` | Team ID: `B6PJBT97RS`

## iOS 26 launch crash — durable lessons

**Root cause pattern:** iOS 26 changed `-[NSException initWithCoder:]` to raise instead of decode. Any plugin reading NSCoding archives (written by an older SDK/iOS) that reference NSException crashes at `UIViewController loadViewIfRequired`, before any UI is shown.

**Which plugin load() methods do real work:** Only `FirebaseAnalyticsPlugin.load()` calls `FirebaseApp.configure()` during plugin registration. All other plugins in this project (Sentry, AppsFlyer, RevenueCat) only register notification observers in their `load()` methods and defer native SDK init to JavaScript calls.

**Why a ObjC @try/@catch subclass does not work:** `CAPBridgeViewController` is implemented in Swift. ObjC exceptions from Swift frames cannot safely unwind to an ObjC `@catch` in a subclass — the barrier does not catch the exception. Do not attempt this pattern.

**Mitigation in place:** `AppDelegate.purgeNSCodingCachesAfterOSUpgrade()` deletes Firebase and Sentry cache directories before UIKit loads the view hierarchy, runs only on the first launch after an iOS major version change, and only records the purge as complete when all deletions succeed (retry on next launch if any fail).

**Permanent fix (applied):** `@sentry/capacitor` bumped to `^4.3.0` (Sentry Cocoa 9.16.1, up from 9.8.0). Cocoa 9.13.0 fixed crash-loop from malformed recrash reports; 9.16.x includes explicit iOS 26 crash fixes. `@sentry/react` pinned to exact `10.69.0` to match `@sentry/capacitor@4.3.0`'s embedded JS SDK; `cap sync ios` was run to update `CapApp-SPM/Package.swift` to the new pnpm path.

**iOS native integration uses SPM (not CocoaPods):** The tracked Xcode project resolves Capacitor plugins via `ios/App/CapApp-SPM/Package.swift` (a local Swift package with pnpm-path references). CocoaPods is not used. After any `pnpm install` that changes a plugin version, `cap sync ios` must be run and `Package.swift` committed so the native path stays valid.

**CocoaPods deprecation note:** `@sentry/capacitor@4.3.0` deprecates its `.podspec`; it will be removed in the next minor release. Since the project already uses SPM this has no immediate impact, but confirms SPM is the correct long-term path.

## Release-source verification

**Rule:** Before reporting a TestFlight upload as containing a fix, verify the workflow `headSha` matches remote `main` and inspect that remote revision for the required code. A successful workflow proves only that its checked-out revision built and uploaded.

**Why:** Build 35 passed every CI job but remote `main` did not contain the locally completed storage and Photos changes, so testers received old behavior in a technically successful upload.

**How to apply:** Push and fetch remote `main`, verify the required symbols/files with `git show origin/main:...`, then confirm the dispatched run reports that exact remote SHA.

**Validation required:** CI can compile, install, launch, and perform a short liveness check on an iOS 26 simulator. Physical hardware is still required to validate upgrades over real persisted caches and visible Photos-library writes.
