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
- RC Android product `store_identifier` = Play Console product ID = `pepscan_pro_unlock_2026`.
- The older Android product `lifetime` is a legacy catalog item and is no longer the Android product in the active Lifetime package.
- Entitlement lookup_key = `Pepscan Pro` (has a space; matches RC_ENTITLEMENT_ID in app code).
- The client accepts only the current offering `unlock` and its `$rc_lifetime` package; it must never fall back to `default`, annual, monthly, or arbitrary lifetime packages.
- A product shown as Published in RevenueCat may be an older catalog entry; verify that today's Play Console product ID is the same before testing. Creating a Play product does not automatically create or link a new RevenueCat product.

## Immediate entitlement updates
- Native Pro-aware screens subscribe through the Capacitor SDK's customer-info update listener and derive access only from the active `Pepscan Pro` entitlement.
- **Why:** purchase and restore callbacks can finish while a different screen is mounted; visibility checks alone leave that screen stale until navigation or app resume.
- **How to apply:** keep the listener cleanup paired with each subscription and keep RevenueCat authoritative; do not persist a separate native membership flag.

## Price display boundary
- Native paywalls must display the localized `priceString` from the selected current-offering package. Non-native gates use neutral one-time-unlock copy and must not contain a local currency fallback.
- **Why:** store prices vary by platform, country, tax, and store updates; a hard-coded fallback can show a stale or incorrect price.
- **How to apply:** keep price loading separate from entitlement state, select only the current `unlock` offering and `$rc_lifetime` package, and never substitute a numeric amount in client copy.

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

## iOS RevenueCat setup
- Code uses platform-specific keys: `VITE_REVENUECAT_IOS_KEY` (appl_ prefix) for iOS,
  `VITE_REVENUECAT_API_KEY` (goog_ prefix) for Android.
- iOS product ID is `com.pepscan.app.pro_lifetime`; it belongs in the same `$rc_lifetime`
  package under the `unlock` offering. Do not reintroduce the old annual product.

## Device-side gotchas that mimic config errors
- Debug APKs (from the push-triggered GitHub workflow) can NEVER purchase — always
  test billing with the Play internal-testing install.
- The SDK caches offerings ~5 min on device; force-stop the app after RC dashboard changes.
