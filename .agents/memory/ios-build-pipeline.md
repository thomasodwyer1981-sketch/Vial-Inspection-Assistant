---
name: iOS build pipeline
description: How the GitHub Actions iOS build works, key signing decisions, and known gotchas.
---

## Final working approach (as of 2026-07-29)

### Archive signing (project.pbxproj)
The App target Release config has these settings baked in directly (NOT as CLI flags — CLI flags cascade to SPM packages and break them):
- `CODE_SIGN_STYLE = Manual`
- `CODE_SIGN_IDENTITY = "Apple Distribution"`
- `PROVISIONING_PROFILE_SPECIFIER = "PepScan App Store"`
- `DEVELOPMENT_TEAM = B6PJBT97RS`

xcodebuild archive uses `-allowProvisioningUpdates` + ASC key flags to download the distribution certificate and profile on demand. No profile is pre-imported before archive.

### Export / upload
ExportOptions.plist: `method=app-store-connect`, `destination=upload`, `signingStyle=manual`, `provisioningProfiles={com.pepscan.app: "PepScan App Store"}`.

**The provisioning profile IS imported** — but only AFTER the archive step completes (a separate workflow step runs `security cms -D` + `cp` to `~/Library/MobileDevice/Provisioning Profiles/`). Importing before archive cascades to SPM package targets and causes signing errors on every library target.

xcodebuild exportArchive also passes ASC key flags so it can resolve the certificate during export.

### destination=upload behavior
With `destination=upload`, xcodebuild uploads directly to App Store Connect and does NOT write a local export folder. Do NOT run `ls $RUNNER_TEMP/export/` after export — the directory won't exist. The separate "Upload to TestFlight" (altool) step is not needed.

### SPM cascade root cause
Importing a provisioning profile into `~/Library/MobileDevice/Provisioning Profiles/` before `xcodebuild archive` causes Xcode to attempt to apply that profile to ALL targets including SPM packages (Firebase, RevenueCat, etc.) which don't support provisioning profiles. Solution: only import the profile after archive completes.

**Why:** SPM-resolved packages are compiled during `xcodebuild archive`. If a profile is present in the system profile store, Xcode tries to apply it globally to satisfy the `CODE_SIGN_STYLE = Manual` setting inherited from the workspace.

## Secrets required (GitHub repo secrets)
- `APPLE_CERTIFICATE_BASE64` — distribution certificate p12
- `APPLE_CERTIFICATE_PASSWORD` — p12 password
- `APPLE_PROVISIONING_PROFILE_BASE64` — "PepScan App Store" profile
- `APP_STORE_CONNECT_KEY_BASE64` — ASC API key p8
- `APP_STORE_CONNECT_KEY_ID` — ASC key ID
- `APP_STORE_CONNECT_ISSUER_ID` — ASC issuer ID
- `GOOGLESERVICE_INFO_PLIST_BASE64` — optional; workflow skips if missing

## Outstanding
- Firebase iOS: Thomas needs to add iOS app to Firebase `pepscan-f78ce`, download `GoogleService-Info.plist`, base64-encode → `GOOGLESERVICE_INFO_PLIST_BASE64` secret
- Play Console AD_ID declaration still needed to unblock Android build 25 rollout
