/**
 * VialScreen — Local Storage Persistence
 *
 * All data is stored client-side in localStorage.
 * No server-side persistence. No authentication.
 * Data lives only in the user's browser.
 */

import type { ScanSession, HistoryItem, OnboardingState } from '../types';

const KEYS = {
  ONBOARDING: 'vialscreen:onboarding',
  SCAN_HISTORY: 'vialscreen:history',
  ACTIVE_SESSION: 'vialscreen:active-session',
} as const;

// ----------------------------------------------------------------
// Onboarding State
// ----------------------------------------------------------------

export function getOnboardingState(): OnboardingState {
  try {
    const raw = localStorage.getItem(KEYS.ONBOARDING);
    if (!raw) return { completed: false, disclaimerAcknowledgedAt: null };
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return { completed: false, disclaimerAcknowledgedAt: null };
  }
}

export function setOnboardingComplete(): void {
  const state: OnboardingState = {
    completed: true,
    disclaimerAcknowledgedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEYS.ONBOARDING, JSON.stringify(state));
  } catch {
    // quota exceeded — onboarding state could not be persisted
    // the user will see onboarding again on next visit, which is acceptable
  }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(KEYS.ONBOARDING);
  } catch {
    // ignore
  }
}

// ----------------------------------------------------------------
// Scan History (summary list)
// ----------------------------------------------------------------

export function getScanHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEYS.SCAN_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out malformed/corrupted entries so the rest of the app never sees partial data
    return parsed.filter(
      (item): item is HistoryItem =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.createdAt === 'string' &&
        typeof item.triageResult === 'string' &&
        typeof item.overallConfidence === 'number',
    );
  } catch {
    return [];
  }
}

export function addToHistory(session: ScanSession): void {
  try {
    const history = getScanHistory();

    // Use the small capture thumbnail — NEVER the full-resolution dataUrl.
    // A full-res base64 frame is 200 KB–2 MB; storing one per history item
    // exhausts the ~5 MB localStorage quota after only a few scans.
    const thumb = session.captures.find((c) => c.thumbDataUrl)?.thumbDataUrl ?? null;

    const item: HistoryItem = {
      id: session.id,
      createdAt: session.createdAt,
      triageResult: session.analysisResult?.triageResult ?? 'review',
      peptideName: session.metadata.peptideName || 'Unnamed Vial',
      vendor: session.metadata.vendor || '',
      overallConfidence: session.analysisResult?.overallConfidence ?? 0,
      thumbnailDataUrl: thumb,
      appearanceProfile: session.metadata.appearanceProfile ?? null,
    };

    // Prepend (newest first), keep max 100 items
    const updated = [item, ...history.filter((h) => h.id !== session.id)];
    const kept = updated.slice(0, 100);
    // Also delete the full session records of pruned entries — otherwise
    // their localStorage keys linger forever and eat quota.
    for (const dropped of updated.slice(100)) {
      try { localStorage.removeItem(sessionKey(dropped.id)); } catch { /* ignore */ }
    }
    localStorage.setItem(KEYS.SCAN_HISTORY, JSON.stringify(kept));
  } catch {
    // quota exceeded or serialization error — history entry could not be written
    console.warn('[VialScreen] Could not write history entry — storage may be full.');
  }
}

export function removeFromHistory(id: string): void {
  try {
    const history = getScanHistory().filter((h) => h.id !== id);
    localStorage.setItem(KEYS.SCAN_HISTORY, JSON.stringify(history));
  } catch {
    console.warn('[VialScreen] Could not remove history entry.');
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEYS.SCAN_HISTORY);
  } catch {
    // ignore
  }
}

// ----------------------------------------------------------------
// Full Scan Sessions (for detail view)
// Each session is stored separately by its ID to avoid a single
// giant localStorage key with all captures (base64 images are large).
// ----------------------------------------------------------------

function sessionKey(id: string): string {
  return `vialscreen:session:${id}`;
}

/** Returns true if saved successfully, false if storage quota was exceeded. */
export function saveSession(session: ScanSession): boolean {
  try {
    // Strip image dataUrls before persisting — base64 images are 200 KB–2 MB each
    // and quickly exhaust localStorage's ~5 MB quota. Analysis results, metadata,
    // and the history thumbnail (stored separately) are preserved.
    const lean: ScanSession = {
      ...session,
      captures: session.captures.map((c) => ({ ...c, dataUrl: '' })),
    };
    localStorage.setItem(sessionKey(session.id), JSON.stringify(lean));
    return true;
  } catch (e) {
    console.warn('[VialScreen] Could not save session — storage quota may be full:', e);
    return false;
  }
}

export function loadSession(id: string): ScanSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Basic shape validation — guard against corrupted or migrated data
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.id !== 'string' ||
      !Array.isArray(parsed.captures)
    ) {
      return null;
    }
    return parsed as ScanSession;
  } catch {
    return null;
  }
}

export function deleteSession(id: string): void {
  try {
    localStorage.removeItem(sessionKey(id));
    removeFromHistory(id);
  } catch {
    console.warn('[VialScreen] Could not delete session.');
  }
}

// ----------------------------------------------------------------
// Active Session (in-progress scan — for accidental close recovery)
// ----------------------------------------------------------------

export function saveActiveSession(session: ScanSession): void {
  try {
    localStorage.setItem(KEYS.ACTIVE_SESSION, JSON.stringify(session));
  } catch {
    // quota exceeded — skip (best-effort only)
  }
}

export function loadActiveSession(): ScanSession | null {
  try {
    const raw = localStorage.getItem(KEYS.ACTIVE_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Same shape validation as loadSession — guard against corrupted data
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.id !== 'string' ||
      !Array.isArray(parsed.captures)
    ) {
      return null;
    }
    return parsed as ScanSession;
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(KEYS.ACTIVE_SESSION);
  } catch {
    // ignore
  }
}

// ----------------------------------------------------------------
// Backup export / import
// ----------------------------------------------------------------

export interface ExportPayload {
  app: 'pepscan';
  version: 1;
  exportedAt: string;
  history: HistoryItem[];
  sessions: ScanSession[];
}

/** Bundle the full history + session records into a portable backup object. */
export function buildExportPayload(): ExportPayload {
  const history = getScanHistory();
  const sessions = history
    .map((h) => loadSession(h.id))
    .filter((s): s is ScanSession => s !== null);
  return {
    app: 'pepscan',
    version: 1,
    exportedAt: new Date().toISOString(),
    history,
    sessions,
  };
}

/**
 * Merge a backup payload into local storage. Existing scans (matched by id)
 * are kept as-is; only new entries are added. Throws on unrecognized files.
 */
export function importExportPayload(payload: unknown): { imported: number; skipped: number } {
  const p = payload as Partial<ExportPayload> | null;
  if (!p || p.app !== 'pepscan' || !Array.isArray(p.history)) {
    throw new Error('Not a PepScan backup file.');
  }

  const existing = getScanHistory();
  const existingIds = new Set(existing.map((h) => h.id));

  const additions: HistoryItem[] = [];
  let skipped = 0;
  for (const item of p.history) {
    if (
      !item ||
      typeof item.id !== 'string' ||
      typeof item.createdAt !== 'string' ||
      existingIds.has(item.id)
    ) {
      skipped++;
      continue;
    }
    additions.push(item);
  }

  // Resolve the final retained set BEFORE writing anything, so the history
  // write and the session-record writes agree on what survives the 100-item cap.
  const merged = [...additions, ...existing].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const retained = merged.slice(0, 100);
  const dropped = merged.slice(100);
  const retainedIds = new Set(retained.map((h) => h.id));

  const importedItems = additions.filter((i) => retainedIds.has(i.id));
  skipped += additions.length - importedItems.length; // new items that fell past the cap

  // Commit the history list first — if this throws (quota), no session
  // records have been written yet, so storage is left exactly as it was.
  try {
    localStorage.setItem(KEYS.SCAN_HISTORY, JSON.stringify(retained));
  } catch {
    throw new Error('Not enough storage space to import this backup. Delete some scans and try again.');
  }

  // Session detail records: only for imports that made the cut (best-effort —
  // a quota failure here loses only the detail view, not the history row).
  const sessionsById = new Map(
    (Array.isArray(p.sessions) ? p.sessions : [])
      .filter((s): s is ScanSession => Boolean(s) && typeof s.id === 'string')
      .map((s) => [s.id, s]),
  );
  for (const item of importedItems) {
    const sess = sessionsById.get(item.id);
    if (sess) {
      try {
        localStorage.setItem(sessionKey(item.id), JSON.stringify(sess));
      } catch {
        // quota — history entry still imports, detail view will be missing
      }
    }
  }

  // Prune session records for anything the cap pushed out (mirrors
  // addToHistory's orphan cleanup — orphaned blobs silently eat quota).
  for (const d of dropped) {
    try {
      localStorage.removeItem(sessionKey(d.id));
    } catch {
      // ignore
    }
  }

  return { imported: importedItems.length, skipped };
}

// ----------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------

export function generateId(): string {
  return `vs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createNewSession(): ScanSession {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    currentStep: 0,
    disclaimerAcknowledged: true,
    metadata: {
      peptideName: '',
      vendor: '',
      batchLot: '',
      concentration: '',
      purchaseDate: '',
      notes: '',
      appearanceProfile: null,
      scanMode: 'reconstituted',
    },
    captures: [],
    analysisResult: null,
    finalized: false,
  };
}
