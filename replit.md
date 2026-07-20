# VialScreen

A mobile-first consumer visual screening assistant for small research/peptide vials. Uses the phone camera to check for obvious visual red flags — visible particles, haze, fill anomalies, label readability — and produces a triage result: Pass / Review / Do Not Use. All analysis runs locally on the device; no data is sent to a server.

## Run & Operate

- `pnpm --filter @workspace/vialscreen run dev` — start the VialScreen web app
- `pnpm --filter @workspace/vialscreen run typecheck` — typecheck vialscreen
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifact: `artifacts/vialscreen`, preview path `/`)
- Routing: Wouter
- Styling: Tailwind CSS v4 + custom CSS variables design system
- Image analysis: Canvas 2D API (heuristic scoring, no AI)
- OCR: Tesseract.js (dynamically imported, English, client-side only)
- Persistence: localStorage only (no backend, no auth, no database)
- UI components: shadcn/ui (Radix primitives)
- Fonts: Plus Jakarta Sans (body) + Spline Sans Mono (mono)

## Where things live

- `artifacts/vialscreen/src/types/index.ts` — all TypeScript types (ScanSession, AnalysisResult, CategoryScore, etc.)
- `artifacts/vialscreen/src/analysis/imageAnalysis.ts` — Canvas 2D pixel analysis primitives
- `artifacts/vialscreen/src/analysis/engine.ts` — main 8-category heuristic scoring engine
- `artifacts/vialscreen/src/utils/storage.ts` — localStorage CRUD (sessions, history, onboarding state)
- `artifacts/vialscreen/src/utils/camera.ts` — camera capture via file input + getUserMedia
- `artifacts/vialscreen/src/constants/copy.ts` — all user-facing strings and disclaimers
- `artifacts/vialscreen/src/hooks/useScanSession.ts` — central scan session state hook
- `artifacts/vialscreen/src/pages/` — 8 screens (Onboarding, OnboardingGate, Home, Scan, Setup, History, HistoryDetail, Limitations)
- `artifacts/vialscreen/src/components/` — 7 domain components + shadcn/ui primitives

## Architecture decisions

- **Frontend-only, no backend**: All state lives in localStorage. Sessions store full base64 image data. Each session is stored as a separate localStorage key to avoid one giant key.
- **File input as primary camera path**: `<input capture="environment">` is used instead of getUserMedia because it's more reliable across iOS Safari and Android WebView. getUserMedia utilities exist in camera.ts but are secondary.
- **Heuristic engine, no AI**: All 8 analysis categories use Canvas 2D pixel math (Laplacian variance, BFS connected components, brightness profiles). Results are explicitly labeled as heuristic throughout the UI.
- **Resume session via localStorage**: On navigating to `/scan`, the hook checks `loadActiveSession()` first. "Start New Scan" explicitly calls `clearActiveSession()` before navigating to ensure a fresh session.
- **Tesseract.js dynamically imported**: Only loaded when a label capture exists, to avoid bloating the initial bundle.

## Product

VialScreen guides users through a 5-step standardized visual inspection:
1. Prepare vial + enter optional metadata (name, vendor, batch, concentration, date, notes)
2. Capture against white background
3. Capture against black background  
4. Capture label (optional, with secondary detail shot)
5. Review captures + run analysis → Pass / Review / Do Not Use

Results include per-category breakdown (8 categories), confidence score, OCR-extracted label text, recommended action, and full regulatory caveat. All results saved to history with thumbnail, triage badge, date, and confidence.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Tesseract.js may need `pnpm approve-builds` if OCR fails at runtime (build scripts were ignored during install)
- localStorage quota can fill up quickly with multiple base64-image sessions; the storage layer silently catches quota errors
- The Canvas analysis runs in the browser main thread; very large images (>1920px) are downscaled before analysis
- `fixed` positioning inside `max-w-md` containers breaks on wide screens — the ResultsStep uses a flex-column sticky footer instead to avoid this

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
