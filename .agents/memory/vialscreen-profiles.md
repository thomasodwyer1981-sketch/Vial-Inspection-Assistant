---
name: VialScreen Appearance Profile Design
description: How AppearanceProfile flows through types → engine → UI, including backward compat rules
---

## The rule

`AppearanceProfile` type: `'clear-standard' | 'ghk-cu' | 'glp1-clear' | 'unknown-custom'`.

Profile lives in `ScanMetadata.appearanceProfile: AppearanceProfile | null`. Null means not yet selected — required before capture starts (PrepareStep gates "Begin Capture" on profile !== null).

**Why:** Different compounds have different expected appearances. GHK-Cu gets false clarity flags under default "clear = good"; GLP-1s (semaglutide, tirzepatide) have slight yellow that's physiologically normal and must not be penalized; unknown profile disables color-based signals entirely.

## Engine contract

`runAnalysis()` takes `profile?: AppearanceProfile | null` as 4th arg. Passes it to `scoreClarityHaze()`. Result object carries `profileUsed: AppearanceProfile | null`.

`scoreClarityHaze` profile behavior:
- `ghk-cu`: checks `computeColorProfile()` for `blueDominant` (meanB − meanR > 20 && meanB > 80). If true → skip color flag, assess turbidity only, pass at ≥65. If blue not detected despite profile → note discrepancy.
- `glp1-clear`: computes `oxidationSuspected` normally (amberDominant && profile !== 'ghk-cu'), but applies reduced penalty of 5 (vs 12 for clear-standard). Slight yellow/warm tint gets a note but doesn't flag.
- `unknown-custom`: exclude color, apply −8 conservative score offset, pass threshold effectively higher.
- `clear-standard` (default): existing std dev haze logic, full 12pt oxidation penalty for amber.

Triage adjustment: `unknown-custom` + `triageResult === 'pass'` + `overallConfidence < 78` → downgrade to `'review'`.

## Backward compat

Old sessions: `appearanceProfile` field absent from `ScanMetadata` and `HistoryItem`. All consumers must default with `?? null`. `HistoryItem.appearanceProfile` is `optional` (`?`).

`HistoryDetailScreen` resolves profile as: `result.profileUsed ?? metadata.appearanceProfile ?? null`.

## APPEARANCE_PROFILES constant

Lives in `src/types/index.ts` (co-located with the type). Contains `label` and `description`. `APPEARANCE_PROFILE_COPY` in `constants/copy.ts` adds `analysisNote` for richer display.

## Where the picker lives

Inside `PrepareStep` in `ScanScreen.tsx` — NOT a separate route or step. Four radio-card buttons (order: clear-standard, glp1-clear, ghk-cu, unknown-custom). Both profile selected AND checklist complete are required to enable "Begin Capture".

## Exhaustive Record sites (must update when adding profiles)

- `APPEARANCE_PROFILES` in `src/types/index.ts`
- `APPEARANCE_PROFILE_COPY` in `src/constants/copy.ts`
- `PROFILE_BADGE` in `src/pages/HistoryScreen.tsx`
