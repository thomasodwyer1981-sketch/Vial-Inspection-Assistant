---
name: VialScreen RevenueCat payments
description: RC error-23 root cause, RC connector API access pattern, and the Play/RC identifier contract
---

# RevenueCat (Android / Play Billing)

## Error 23 root cause (fixed 2026-07-25)
`getOfferings()` threw ConfigurationError (code 23) because the current offering's
packages contained ONLY Test Store products. The Play Store product existed in RC
but was never attached to a package, so on-device Play Billing had nothing fetchable.
**Fix:** attach the Play product to the `$rc_lifetime` package. Packages hold one
product per app/platform; Test Store + Play products coexist in the same package by design.
**How to apply:** if a store build errors on getOfferings, check the offering's package
products' `app_id` against the store app's id before suspecting credentials or testers.

## Identifier contract (must stay in sync)
- RC product `store_identifier` = Play Console in-app product ID = `lifetime`.
- Entitlement lookup_key = `Pepscan Pro` (has a space; matches RC_ENTITLEMENT_ID in app code).
- Client picks `offerings.current.lifetime` first, so the Play product must live in the `$rc_lifetime` package.
- A product shown as Published in RevenueCat may be an older catalog entry; verify that today's Play Console product ID is the same before testing. Creating a Play product does not automatically create or link a new RevenueCat product.

## Accessing the RC API from the workspace
- The RevenueCat Replit connection's credentials are NOT visible to the CodeExecution
  sandbox (`listConnections('revenuecat')` returns `[]` even when status is `added`).
- **Why:** credentials are withheld from the sandbox for this connector; not a slug problem.
- **How to apply:** write a temp `.mjs` script in the workspace root (module resolution
  fails from /tmp) using `@replit/connectors-sdk` → `connectors.proxy("revenuecat", "/v2/...")`,
  run with node, delete after. Proxy returns a raw Response — call `.json()`.
- Attach/detach use action routes: `POST /v2/projects/{pid}/packages/{pkg}/actions/attach_products`
  with `{ products: [{ product_id, eligibility_criteria: "all" }] }`. Plain POST on
  `/packages/{pkg}/products` is 405.
- Project `proj08d7d92d` (Pepscan); Play app `appbb4c6b1f97` (com.pepscan.app).

## iOS RevenueCat setup (pending as of 2026-07-29)
- Code updated to use platform-specific keys: `VITE_REVENUECAT_IOS_KEY` (appl_ prefix) for iOS,
  `VITE_REVENUECAT_API_KEY` (goog_ prefix) for Android.
- iOS product ID in App Store Connect: `com.pepscan.app.pro_annual` (1-year, $4.99)
- RC iOS app not yet created — user needs to: add App Store app in RC dashboard,
  upload P8 key from App Store Connect → Users and Access → Integrations → In-App Purchase,
  get the appl_ SDK key, then set VITE_REVENUECAT_IOS_KEY secret.
- The current client purchase selector requires a Lifetime package on both platforms; do not reintroduce the old annual package as the fallback.

## Device-side gotchas that mimic config errors
- Debug APKs (from the push-triggered GitHub workflow) can NEVER purchase — always
  test billing with the Play internal-testing install.
- The SDK caches offerings ~5 min on device; force-stop the app after RC dashboard changes.
