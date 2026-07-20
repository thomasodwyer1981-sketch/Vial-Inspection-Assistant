# Vial# VialScreen — Status ReportScreen — Status Report
_Generated: 20 July 2026_

---
ç
## ✅ DONE

### Core Application
- **7-screen routing** — Onboarding, Home, Setup, Scan (5 steps), History, History Detail, Limitations
- **Onboarding gate** — disclaimer + checkbox; persisted in localStorage; blocks all other routes until accepted
- **Session lifecycle** — start, resume, finalize, delete; active session survives page refresh

### Scan Flow (5 user steps)
- **Prepare** — 5-point checklist + 6 metadata fields (name, vendor, batch/lot, concentration, purchase date, notes); scrollable on small screens
- **White-background capture** — file input with `capture="environment"`; framing guide; retake from review
- **Black-background capture** — same pattern; distinct copy and tips
- **Label capture** — primary + optional secondary; skippable (OCR returns `unable` when skipped)
- **Review step** — thumbnail grid of all captures; per-capture retake; zero-captures guard with back button
- **Analysis step** — live OCR status messages (loading model → recognizing text → %); "first-run may take 10–30 s" notice; animated progress indicator
- **Results step** — PASS / REVIEW / DO NOT USE triage badge; per-category score cards; Recommended Action block; DisclaimerBanner; sticky Save footer; no overflow on any screen size

### Analysis Engine (client-side only, no backend)
- 8 scoring categories: visible particles, color/clarity, fill level, container integrity, label presence/legibility, label OCR confidence, white-bg quality, black-bg quality
- Confidence score (0–100) averaged from non-`unable` categories
- Triage bias toward REVIEW — a single flag produces REVIEW, not PASS; PASS requires zero flags across all categories
- Graceful `unable` degradation — missing captures or OCR failure → category excluded from triage, not a crash

### Reliability & Edge Cases
- Canvas `getContext('2d')` null guard — no crash in private browsing / memory pressure
- `scoreVisibleParticles` returns `score: 0` (not 100) when no captures — avoids misleading confidence inflation
- `getScanHistory()` filters malformed localStorage entries — no broken render
- `loadSession()` validates shape before returning — no partial-data crashes
- `saveSession()` returns `boolean` — caller can detect quota exceeded
- CaptureButton shows inline error banner if the camera/file API throws (not silent failure)
- All screens handle missing/null state — no blank screens or unhandled errors on direct URL access or refresh

### Trust & Copy
- No "safe", "verified", "authentic", "approved", "guaranteed" language in any result context
- PASS result explicitly states: _"negative screen only — does not replace direct examination"_
- Recommended Action block on result screen AND history detail screen
- DisclaimerBanner present on: Setup, Results, History list, History Detail
- Limitations screen covers: lighting, optics, OCR accuracy, no lab testing

### History
- List view — always-visible delete buttons (no hover-only); empty state with CTA
- Detail view — metadata section hidden when empty; Recommended Action shown; delete works
- Clear All — confirmation dialog before irreversible wipe

---

## 🔲 LEFT TO DO

### High Priority (before real users)
| # | Item | Notes |
|---|---|---|
| 1 | **Storage-full warning in UI** | `saveSession()` already returns `false` on quota exceeded. Needs a one-line toast/banner wired into the ResultsStep "Save & Finish" path. ~1 hour of work. |
| 2 | **Real-device camera test** | The `<input capture="environment">` path MUST be verified on iOS Safari and Android Chrome with an actual vial photo. Cannot be simulated in browser preview. |
| 3 | **Aesthetic / design pass** | Current UI is functional but unpolished. Colours, typography, spacing, and component feel need a design pass before the app looks consumer-ready. |

### Medium Priority (next sprint)
| # | Item | Notes |
|---|---|---|
| 4 | **Tesseract pre-warm** | Optionally kick off `import('tesseract.js')` silently on app load so the 30 MB model download happens in the background, not when the user hits "Run Analysis". |
| 5 | **Live camera viewfinder** | Currently file-input only. A `getUserMedia` + `<video>` preview phase in CaptureStep would improve photo quality and UX on mobile. Medium complexity — needs permission handling. |
| 6 | **Storage quota management** | base64 images fill localStorage fast. Options: cap history at N sessions with auto-eviction, or offer "export + clear" before storage runs out. |

### Low Priority / Nice to Have
| # | Item | Notes |
|---|---|---|
| 7 | **PWA / offline support** | Service worker + web manifest for "Add to Home Screen" install. No functional blocker without it. |
| 8 | **Export scan as PDF/image** | User can screenshot, but a one-tap export of the result + metadata would be useful for records. |
| 9 | **Crack/damage scoring accuracy** | Current scorer uses brightness std dev as a proxy — it is a known weak signal. Improving it requires either more sophisticated CV heuristics or a model. |

---

## 💡 RECOMMENDATIONS

**Do these in order:**

1. **Wire the storage-full toast** — 30 minutes, high safety value. `saveSession()` returns `false` already; just surface it.
2. **Design pass** — the app works; now make it feel like a real product. Focus on the Results screen first (that's the money moment for the user).
3. **Device test before any public share** — especially OCR first-run timing on a cold iOS Safari session.
4. **Pre-warm Tesseract** — cheap win, cuts the "why is it frozen?" moment on first real use.
5. **Viewfinder** — saves for a later sprint; the file-input path works and is the most compatible option right now.

---

## KNOWN LIMITATIONS (honest, document these externally)
- All analysis is heuristic (computer vision rules), not AI or lab testing
- Results are a visual screen only — not a safety certification
- OCR accuracy depends on label print quality and lighting
- No cloud sync, no account — data is device-local only
- No live camera viewfinder in the current version
