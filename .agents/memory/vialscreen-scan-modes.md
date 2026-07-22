---
name: Scan modes and powder analysis
description: ScanMode type, powder scan flow, Pro gate in PrepareStep, and wallpaper CSS.
---

## ScanMode type
- `'reconstituted' | 'powder'` — exported from `types/index.ts`
- Optional in `ScanMetadata.scanMode` for backward compat with old sessions
- Always default with `?? 'reconstituted'` when reading

## Powder scan flow
1. User selects "Pre-Mix Powder" in `PrepareStep` — gated behind `useProStatus().isPro`
2. If not Pro → shows inline upgrade card with navigate('/upgrade') link
3. `black-capture` step is auto-skipped via useEffect in `ScanScreenInner` when `scanMode === 'powder'`
4. `DualCaptureStep` uses `SCAN_COPY.powderCapture` copy for the white-capture step in powder mode
5. `runAnalysis()` in engine.ts branches to `runPowderAnalysis()` when `scanMode === 'powder'`

## Powder analysis engine
- Runs: captureQuality, powderAppearance (reuses 'clarity' CategoryKey), capIntegrity, labelOcr, crackDamage, glare
- Skips: turbidity/clarity, visibleParticles, fillLevel (not applicable pre-reconstitution)
- `scorePowderAppearance()` checks: amberDominant penalty (22pts), dark brightness penalty (12pts, mean < 170)
- profileUsed: null (powder analysis is profile-agnostic)

## PrepareStep logic
- `canProceed`: powder mode = checklist only; liquid mode = checklist + profile required
- Checklist resets on mode change (useRef prevScanModeRef + useEffect)
- Appearance profile section hidden when isPowder

## Wallpaper CSS
- `--background: 215 45% 97%` (subtle teal-tinted off-white, not pure clinical white)
- `.bg-background` overridden in `@layer utilities` with: teal glow (top-left), navy glow (bottom-right), dot grid (26px × 26px, rgba(20,201,160,0.07) at 1.5px)
- `background-attachment: fixed` → all bg-background elements share same viewport-aligned pattern = seamless wallpaper

**Why:** `background-attachment: fixed` on all `.bg-background` elements means the pattern is positioned relative to viewport, not element — creates a single unified wallpaper across all screens.

## Exhaustive update sites for new ScanMode
- `types/index.ts` — ScanMode type + ScanMetadata.scanMode field
- `utils/storage.ts` — createNewSession() default: `scanMode: 'reconstituted'`
- `hooks/useScanSession.ts` — passes `current.metadata.scanMode ?? 'reconstituted'` to runAnalysis
- `analysis/engine.ts` — runAnalysis accepts scanMode param; branches to runPowderAnalysis
- `constants/copy.ts` — SCAN_COPY.prepare.powderChecklist + SCAN_COPY.powderCapture
- `pages/ScanScreen.tsx` — PrepareStep scan type selector + auto-skip effect + DualCaptureStep
