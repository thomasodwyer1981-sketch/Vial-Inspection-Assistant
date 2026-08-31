---
name: iOS tracking policy
description: PepScan's chosen App Tracking Transparency and IDFA policy for iOS releases.
---

PepScan must not declare or request App Tracking Transparency permission on iOS and must not access IDFA. AppsFlyer may continue providing non-ATT attribution and analytics, with production debug logging disabled.

**Why:** The user chose the no-ATT submission path after App Store Connect blocked review because the binary declared tracking permission without an explicit ATT consent flow.

**How to apply:** Keep the iOS privacy manifest, App Store privacy answers, in-app privacy copy, and analytics configuration consistent with no ATT/IDFA. Do not restore the tracking usage description or ATT wait/request logic unless the user explicitly reverses this policy and approves the corresponding consent flow and disclosures.