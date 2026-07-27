# Agent Memory Index

- [VialScreen architecture](vialscreen-arch.md) — stack, key files, and non-obvious decisions for the VialScreen MVP
- [Appearance profile design](vialscreen-profiles.md) — how AppearanceProfile flows from type → engine → UI and backward compat rules
- [Save/retry persistence fix](vialscreen-save-retry.md) — pendingSave flag design: why finalizeSession must NOT clear active session on failure
- [Results & sharing features](vialscreen-results-features.md) — share card canvas generator, contextual findings, By Vial history tab
- [Scan modes and powder analysis](vialscreen-scan-modes.md) — ScanMode type, powder flow, Pro gate, wallpaper CSS approach
- [localStorage quota & thumbnails](vialscreen-quota-thumbnails.md) — never store full dataUrls in history; 144px thumbs + orphaned-session pruning rules
- [RevenueCat payments](vialscreen-revenuecat.md) — error-23 root cause (offering lacked the Play product), RC connector API access pattern, Play/RC identifier contract
- [Release pipeline gotchas](vialscreen-release-pipeline.md) — mixed Sentry-version launch crash, AAB content verification via bundle grep, Play track opt-in traps
