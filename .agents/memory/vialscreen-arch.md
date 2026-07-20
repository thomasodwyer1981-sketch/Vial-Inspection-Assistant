---
name: VialScreen architecture
description: Key architectural decisions, gotchas, and constraints for the VialScreen MVP — things not derivable from reading the code alone.
---

## Stack
React + Vite, TypeScript, Tailwind CSS v4, Wouter routing, localStorage only.

## Primary camera path
`<input type="file" capture="environment">` — NOT getUserMedia. This is intentional for iOS/Android reliability. getUserMedia utilities exist in camera.ts but are secondary.

## Analysis engine
Canvas 2D API only — no AI. `runAnalysis()` runs 8 scorers in parallel via `Promise.all`. OCR (Tesseract.js) is dynamically imported only when a label capture exists, to avoid bundle bloat.

## OCR progress threading
`runAnalysis(captures, name, onProgress?)` — third parameter is optional. `useScanSession` passes `setAnalysisStatus` as `onProgress`. `AnalysisStep` reads `analysisStatus` from the hook. Tesseract logger pipes back through this chain. First-run OCR can take 10–30s (language model download).

## ResultsStep layout
Uses `flex flex-col h-full` with `flex-1 overflow-y-auto` + `shrink-0` footer — NOT `fixed bottom-0`. Fixed positioning inside a `max-w-md` container breaks on wide screens; the flex approach is correct.

## Session storage pattern
Each session is a separate localStorage key (`vialscreen:session:<id>`) to avoid one giant key containing all base64 images. Active session: `vialscreen:active-session`. History index: `vialscreen:history`.

## Storage validation
`getScanHistory()` filters malformed items (missing id/createdAt/triageResult). `loadSession()` validates shape before returning. `saveSession()` returns boolean (false = quota exceeded).

## Scoring bias
Engine strongly biased toward REVIEW over PASS: poor capture quality → forced REVIEW; single flagged category → REVIEW (not PASS); only produces PASS when zero flags, zero reviews, and quality not degraded.

## `scoreVisibleParticles` unable score
Returns `score: 0, status: 'unable'` when no captures available. Previously returned score: 100 (bug — inflated confidence).

**Why:** A score of 100 for an unable category could have inflated the overall confidence average even though the category was filtered from triage. Now correctly scores 0 so any confidence calc that includes it won't be misleadingly high.

## PrepareStep scrolling
PrepareStep has 5 checklist items + 6 metadata fields. Container uses `flex-1 overflow-y-auto` on the inner content div, not `h-full` — prevents content overflow on small screens.

## Result copy rule
`RESULT_COPY` in `copy.ts` is the single source of truth for all result-specific strings (summary, caveat, action). Never duplicate result-specific copy elsewhere. "Pass" copy must never imply safety — always references "negative screen only" / "does not replace direct examination".
