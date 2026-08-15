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
`APPLE_CERTIFICATE_BASE64`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_PROVISIONING_PROFILE_BASE64`, `APP_STORE_CONNECT_KEY_BASE64`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `GOOGLESERVICE_INFO_PLIST_BASE64` (optional — CI skips Firebase plist injection if absent).

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

**Validation required:** iOS 26 device/simulator validation cannot be performed from a CI environment. Physical hardware is needed to install build 32 over a build with persisted Firebase/Sentry state and verify repeated launches succeed.
