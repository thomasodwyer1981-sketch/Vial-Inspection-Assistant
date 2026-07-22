---
name: Results & Sharing Features
description: Share card canvas generator, contextual findings explanation, By Vial history grouping
---

## Share Card (`src/utils/shareCard.ts`)
- Generates a 1080×1080 PNG on an offscreen `<canvas>` — no external library needed.
- `shareOrDownloadCard()` tries Web Share API with `files:` first (Android Chrome, iOS 15.1+), then falls back to triggering a download.
- Uses `hexAlpha()` helper for rgba from hex; `roundedRect()` uses `arcTo` for cross-browser compatibility (not `ctx.roundRect` which is newer).
- Input shape: `ShareCardInput` — triageResult, confidence, peptideName, vendor, primaryReasons (max 3 shown).

## Contextual Findings (ScanScreen ResultsStep)
- `FINDING_CONTEXT_MAP` is module-level (above `ResultsStep`), keyed by regex patterns matching common finding strings.
- `getFindingContext(finding)` returns a 1-2 sentence plain-language explanation or `null`.
- Findings render with a red dot + destructive-tinted background when the text matches a concern pattern; normal style otherwise.
- Context appears inline below the finding text (no tap required), separated by a subtle divider.

## Share Sheet (ScanScreen ResultsStep)
- `showShareSheet` + `generatingCard` local state.
- Two options: "Share Image Card" (calls `shareOrDownloadCard`) and "Share Text Summary" (existing text share via navigator.share / clipboard).
- Bottom sheet uses `fixed inset-0` backdrop + `fixed bottom-0` panel; max-w-md so it's centered on desktop.

## CategoryScoreCard auto-expand
- Changed initial `expanded` state from `false` to `category.status !== 'pass'`.
- Pass categories start collapsed (less important); flagged/review ones open immediately so explanation is visible.

## By Vial tab (HistoryScreen)
- `buildVialProfiles(history)` helper (module-level) groups by `peptideName`, sorts items within each group newest-first, returns `{name, items, latest, passCount, reviewCount, doNotUseCount}[]`.
- Component useMemo calls `buildVialProfiles(history).sort(...)` to order profiles by most recent scan.
- Tabs ("All Scans" | "By Vial") only render when `history.length > 0`.
- `VialProfileCard` links to `latest.id` in history detail; shows thumbnail strip (up to 4), verdict dots, scan count.
- "Save & Finish" button renamed to "Save Vial Record".

**Why:** User asked for three features: better explanations, vial profile save/grouping, and social share card for Instagram/Twitter.
