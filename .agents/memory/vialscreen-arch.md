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

## Non-obvious decisions
- `ScanSession.pendingSave?: boolean` — set when finalize fails due to quota; preserves active session so user can free storage and resume to results without data loss.
- `APPEARANCE_PROFILES` constant lives in `types/index.ts` (co-located with the type, not copy.ts) because engine.ts imports it directly.
- Old history items have `appearanceProfile: undefined` — all consumers must use `?? null`.
- Error boundary (`ErrorBoundary.tsx`) wraps the entire app in `App.tsx` — prevents blank screen on unhandled React errors.
- Share button uses Web Share API with clipboard fallback; shows "Copied!" state on clipboard success.
