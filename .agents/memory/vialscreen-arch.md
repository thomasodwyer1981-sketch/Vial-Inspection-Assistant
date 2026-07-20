---
name: VialScreen Architecture
description: Stack, key files, and non-obvious decisions for the VialScreen MVP
---

## Stack
- React 18 + TypeScript + Vite (SPA, no SSR)
- Tailwind CSS v4 via `@tailwindcss/vite`
- Wouter for routing (base path from `import.meta.env.BASE_URL`)
- Tesseract.js for OCR (dynamically imported, pre-warmed on HomeScreen mount)
- All analysis is client-side canvas — no AI, no server

## Key files
- `src/types/index.ts` — all data model types (AppearanceProfile, ScanSession, HistoryItem, etc.)
- `src/analysis/engine.ts` — heuristic scoring engine, `runAnalysis()` entry point
- `src/analysis/imageAnalysis.ts` — canvas pixel analysis utilities
- `src/hooks/useScanSession.ts` — central scan state machine + storage persistence
- `src/utils/storage.ts` — all localStorage reads/writes
- `src/constants/copy.ts` — all user-facing text
- `src/pages/ScanScreen.tsx` — multi-step scan flow (PrepareStep → captures → review → analysis → results)
- `src/components/LiveCameraCapture.tsx` — fullscreen camera viewfinder with best-of-3 burst

## Camera flow
`CaptureButton` → opens `LiveCameraCapture` overlay if `isCameraApiAvailable()`, else falls back to `openFilePicker({ capture: 'environment' })`.

`LiveCameraCapture` uses `getUserMedia`, shows live video feed, takes 3 frames on tap (400ms AF settle + 280ms between frames), picks sharpest via Laplacian variance, shows quality feedback, lets user accept or retake. Has torch toggle (where supported).

## PWA
- `public/manifest.webmanifest` — links icon-192.png + icon-512.png (generated from favicon.svg via ImageMagick)
- `public/apple-touch-icon.png` — 180x180 PNG for iOS
- `index.html` has `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
- No service worker — app is not offline-first

## Visual design system
- Primary color: teal `168 75% 38%` light / `168 75% 52%` dark (HSL). NOT blue. Chosen because teal/blue-green is the actual color of copper-peptide complexes (GHK-Cu) and lab equipment — domain-coherent.
- Home screen hero: dark `#0d1117` background with `MolecularPattern` SVG overlay in teal at 9% opacity.
- Favicon: dark rounded square + teal vial icon with molecular bond lines — `public/favicon.svg`. PNG icons regenerated from this SVG via ImageMagick.
- `MolecularPattern.tsx` renders a 320×200 SVG tile with: N-Cα-C=O zigzag backbone, carbonyl branches, NH branches, Phe aromatic ring (hexagon + double bond markers), alpha-carbon dot nodes, and amino acid single-letter watermarks (G, K, P, W, Y) at low opacity.
- `TriageBadge` size="lg" now renders: large circular icon (CheckCircle2 / Eye / XCircle) + pill label below, with soft glow shadow matching the verdict color.
- `DisclaimerBanner` now has a ShieldAlert icon and slightly refined opacity.

## Analysis engine improvements (July 2026)
- `computeDifferentialTurbidity(whiteData, blackData)` — core nephelometry-inspired upgrade. Finds vial ROI from black-bg image via `estimateVialROI()`, then measures brightness delta between the two captures in that region. Clear = high delta (~180-210); turbid = low delta (<80). Used as 65% weight in clarity scoring.
- `estimateVialROI(blackImageData)` — estimates vial body bounding box by finding pixels >28 brightness against a dark background, then insets 10% from edges to exclude curved-glass-wall refraction bands. Falls back to central 55%×65% if detection fails.
- Sediment check inside `computeDifferentialTurbidity` — compares bottom 22% vs body zone brightness in both captures. Black-bg: precipitate appears BRIGHTER than clear body. White-bg: opaque sediment appears DARKER.
- `amberDominant` in `ColorProfile` is now actually used in scoring — applies a 12-point oxidation penalty to standard-clear peptides (oxidation of Met/Trp/Cys residues produces yellow-amber shift).
- `scoreVisibleParticles` — now passes ROI from `estimateVialROI` to `computeParticleAnalysis`, restricting scan to vial body only. Eliminates false positives from label text, cap, background edges.
- `scoreCrackDamage` — threshold raised from std dev >90 to >115. Rounded glass vials inherently produce std dev >90 from glass-wall refraction; old threshold misfired on every normal vial.

## Non-obvious decisions
- `ScanSession.pendingSave?: boolean` — set when finalize fails due to quota; preserves active session so user can free storage and resume to results without data loss.
- `APPEARANCE_PROFILES` constant lives in `types/index.ts` (co-located with the type, not copy.ts) because engine.ts imports it directly.
- Old history items have `appearanceProfile: undefined` — all consumers must use `?? null`.
- Error boundary (`ErrorBoundary.tsx`) wraps the entire app in `App.tsx` — prevents blank screen on unhandled React errors.
- Share button uses Web Share API with clipboard fallback; shows "Copied!" state on clipboard success.
