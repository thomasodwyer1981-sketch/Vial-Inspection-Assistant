# VialScreen — Completion Pass Report
*Session date: July 20, 2026*

---

## What Was Done

### Critical Bug Fixes

| # | File | Issue Fixed |
|---|---|---|
| 1 | `src/hooks/useScanSession.ts` | `finalizeSession()` now returns `boolean` — previously ignored `saveSession()` return value, so quota failure was invisible to the user |
| 2 | `src/hooks/useScanSession.ts` | `addToHistory()` only called when session was actually saved successfully |
| 3 | `src/hooks/useScanSession.ts` | `retrySave(): boolean` method added — allows the user to retry after freeing storage |
| 4 | `src/utils/storage.ts` | `addToHistory()` wrapped in try/catch — quota throws no longer propagate |
| 5 | `src/utils/storage.ts` | `setOnboardingComplete()` wrapped in try/catch |
| 6 | `src/utils/storage.ts` | `loadActiveSession()` now validates object shape before returning — malformed data returns `null` instead of crashing session resumption |
| 7 | `src/pages/ScanScreen.tsx` | `ResultsStep` null guard: `return null` replaced with error state + "Start New Scan" and "Back to Home" buttons |
| 8 | `src/pages/ScanScreen.tsx` | `AnalysisStep` safety-net `useEffect`: if the step renders with no analysis running (e.g. a session resumed stuck at analysis), it auto-triggers analysis once on mount |
| 9 | `src/pages/ScanScreen.tsx` | Save-failure banner added to `ResultsStep` — shown when `finalizeSession()` returns `false`; includes "Free Space →" (navigate to History) and "Try Again" (calls `retrySave()`) buttons |

### Partial / Weak Issues Fixed

| # | File | Change |
|---|---|---|
| 10 | `src/analysis/engine.ts` | 6 `score: 50` → `score: 0` in all `status: 'unable'` returns across `scoreFillLevel`, `scoreCapIntegrity`, `scoreGlareInterference` |
| 11 | `src/pages/ScanScreen.tsx` | `CaptureStep` — "Quality Tips" block added inline (4 tips always visible: center vial, even light, hold steady, avoid reflections) |
| 12 | `src/pages/ScanScreen.tsx` | `ReviewStep` — partial-capture warning shown when white or black background capture is missing; describes exactly what's missing |
| 13 | `src/pages/ScanScreen.tsx` | `AnalysisStep` — OCR phase detection expanded to also match "downloading" and "initializing" status strings |
| 14 | `src/pages/HistoryDetailScreen.tsx` | Low-confidence badge added (`overallConfidence < 50`) — was present on ResultsStep but missing here |
| 15 | `src/pages/HistoryScreen.tsx` | Delete button touch target increased from ~28px to ~44px (mobile minimum) |
| 16 | `src/pages/HistoryScreen.tsx` | Scan count added to header: "Scan History (N)" |
| 17 | `src/pages/HistoryScreen.tsx` | Storage warning banner shown when scan count > 15 |
| 18 | `src/pages/SetupScreen.tsx` | "Start Scan Now" changed from `<Link>` to `<button>` — now calls `clearActiveSession()` before navigating, so a stale in-progress session is never accidentally resumed |
| 19 | `src/pages/HomeScreen.tsx` | OCR pre-warm `useEffect` on mount: `import('tesseract.js').catch(() => {})` — reduces first-analysis cold-start delay |
| 20 | `src/components/CategoryScoreCard.tsx` | Status labels mapped to human-readable English: `"unable"` → `"Unable to Assess"`, `"flag"` → `"Concern Flagged"`, `"review"` → `"Review"`, `"pass"` → `"Pass"` |
| 21 | `src/pages/not-found.tsx` | Replaced dev-facing message ("Did you forget to add the page to the router?") with user-facing "Page Not Found" + "Back to Home" button |
| 22 | `src/utils/camera.ts` | 3 `canvas.getContext('2d')!` non-null assertions replaced with explicit guards + throw/reject |

### QA Verification

- `tsc --noEmit` passes with **zero TypeScript errors**
- **Zero browser console errors** across all routes: `/`, `/home`, `/history`, `/history/<invalid-id>`, `/setup`, `/scan`, `/limitations`, `/onboarding`, `/nonexistent-route`
- All screens visually verified at 390×844 (iPhone SE viewport)

---

## What's Outstanding

### Mandatory Before Real-User Testing

| # | Item | Why |
|---|---|---|
| 1 | **Real-device camera test on iOS Safari + Android Chrome** | `<input capture="environment">` must be verified with an actual vial photo. Specifically: does rear camera open directly, does OCR cold-start complete in acceptable time on a real device cold start, does canvas 2D API behave correctly on mobile WebKit. Cannot be simulated in the browser preview. |
| 2 | **`retrySave` UX gap** | After a save failure, if the user taps "Free Space →" they navigate to History to delete old scans — but the Results screen is gone. There's no seamless way to return to the save-retry state. Currently functional but not seamless. A persistent toast or session-based pending-save flag would close this gap. |

### Recommended Before Public Share

| # | Item | Notes |
|---|---|---|
| 3 | **Aesthetic / design pass** | Current UI is functional and internally consistent. Typography hierarchy, color palette, spacing rhythm, and micro-interactions need a design pass before the app looks consumer-ready. This is the logical next sprint. |
| 4 | **Storage quota precision** | The 15-scan storage warning threshold is a conservative heuristic. A more precise implementation would measure actual key sizes via `JSON.stringify(value).length` and warn at ~70% of the estimated 5 MB limit. |
| 5 | **Tesseract pre-warm verification** | Verify on a real device that the `import('tesseract.js')` on HomeScreen mount actually reduces perceived OCR cold-start delay. On some browsers the dynamic import resolves from cache immediately; on others it still triggers a network fetch. |
| 6 | **PWA / service worker** | Would allow offline use and install-to-homescreen. Required for a production consumer app. Currently no service worker. |

### Known Pre-existing Limitations (Not Blocking)

| # | Item | Notes |
|---|---|---|
| 7 | **No live camera viewfinder** | Intentional: `<input capture="environment">` is the most reliable cross-device path for iOS + Android. A live viewfinder requires `getUserMedia` + `<video>` and is a separate sprint. |
| 8 | **OCR first-run ~30 MB download** | Pre-warm reduces perceived delay but the Tesseract WASM + model download is irreducible without a service worker or server-side OCR. Users on slow connections will wait 10–30 s on first label scan. |
| 9 | **Crack/damage scoring accuracy** | The `stdDevBrightness` proxy is a weak heuristic — acknowledged in the engine method comment and in the limitations screen. Improving accuracy requires a different CV approach or a small on-device model. |
| 10 | **Base64 image storage** | Each full scan stores raw base64 JPEG blobs in localStorage (~200–400 KB per scan). The 15-scan warning helps, but the fundamental approach fills storage quickly. A proper fix requires object storage or IndexedDB with blob references. |

---

## File Manifest (All Changed Files)

```
artifacts/vialscreen/src/
  analysis/
    engine.ts                   — 6× score: 50 → 0 for unable status returns
  components/
    CategoryScoreCard.tsx       — human-readable status labels
  hooks/
    useScanSession.ts           — finalizeSession returns bool, retrySave added
  pages/
    HomeScreen.tsx              — OCR pre-warm useEffect
    HistoryDetailScreen.tsx     — low-confidence badge, AlertTriangle import
    HistoryScreen.tsx           — touch target, scan count, storage warning
    ScanScreen.tsx              — save failure UI, null guard, quality tips,
                                  partial-capture warning, analysis safety-net
    SetupScreen.tsx             — clearActiveSession before navigation
    not-found.tsx               — user-facing page replaces dev message
  utils/
    camera.ts                   — 3 non-null assertion guards
    storage.ts                  — try/catch on addToHistory, setOnboardingComplete;
                                  shape validation on loadActiveSession
```
