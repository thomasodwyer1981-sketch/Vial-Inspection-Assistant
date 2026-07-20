---
name: VialScreen Save/Retry Persistence Fix
description: Why finalizeSession must NOT clear active session on quota failure, and how pendingSave enables retry
---

## The bug that was fixed

`finalizeSession()` was calling `clearActiveSession()` unconditionally — even when `saveSession()` returned false (quota exceeded). This meant the user's finalized result was lost from localStorage the moment they navigated away to free storage.

**Why:** If the user hits "Free Space →" to go to History and delete old scans, the component unmounts and all React state is gone. The only way to survive that navigation is localStorage persistence.

## The fix

On save failure in `finalizeSession()`:
1. Do NOT call `clearActiveSession()`
2. Instead: `saveActiveSession({...finalized, pendingSave: true})`
3. Return `false` (caller shows save-failure banner)

On save success:
1. `addToHistory(finalized)`
2. `clearActiveSession()` — session is now in proper storage; active slot freed

`retrySave()` on success also calls `clearActiveSession()`.

## Mount effect in ScanScreen

```ts
const activeSession = loadActiveSession();
if (activeSession?.finalized && activeSession.pendingSave) {
  resumeSession(activeSession);  // currentStep already = results index
  setSaveFailed(true);           // banner shows immediately
}
```

**Why:** `ScanSession.currentStep` equals the results step index when `finalized` is set (finalizeSession is only called from ResultsStep). So `resumeSession` correctly restores the user directly to results with the banner visible.

## pendingSave field

`ScanSession.pendingSave?: boolean` — optional so older sessions load fine. Cleared (`undefined`) on next successful save.
