/**
 * VialScreen — Local Storage Persistence
 *
 * All data is stored client-side in localStorage.
 * No server-side persistence. No authentication.
 * Data lives only in the user's browser.
 */

import type { ScanSession, HistoryItem, OnboardingState, ScanMode } from '../types';
import { PRO_HISTORY_RECORD_LIMIT } from './pro';
import { captureSaveFailureDiagnostic } from '../lib/sentry';
import {
  clearIndexedHistory,
  deleteIndexedSessionAndWriteHistory,
  deleteIndexedRecord,
  readIndexedRecord,
  replaceIndexedHistory,
  writeIndexedRecord,
} from './indexedDbStorage';

const KEYS = {
  ONBOARDING: 'vialscreen:onboarding',
  SCAN_HISTORY: 'vialscreen:history',
  ACTIVE_SESSION: 'vialscreen:active-session',
} as const;

const SESSION_KEY_PREFIX = 'vialscreen:session:';
const INDEXED_HISTORY_KEY = 'history';
const INDEXED_ACTIVE_SESSION_KEY = 'active-session';
const INDEXED_SESSION_PREFIX = 'session:';
// Keep 100 complete records comfortably below WKWebView's roughly 5 MB
// localStorage ceiling. New 96px JPEGs are typically 2–6 KB; older/larger
// thumbnails are discarded during repair rather than risking all future saves.
const MAX_PERSISTED_THUMBNAIL_CHARS = 12_000;
const MAX_SESSION_THUMBNAIL_CHARS = 24_000;

export type SaveFailureStage = 'detail' | 'history';
export type SaveFailureKind = 'quota' | 'serialization' | 'write';

export interface SaveFailure {
  stage: SaveFailureStage;
  kind: SaveFailureKind;
  errorName: string;
}

let lastSaveFailure: SaveFailure | null = null;
let lastSaveFailureReport: Promise<boolean> | null = null;
let indexedHistory: HistoryItem[] = [];
const indexedSessions = new Map<string, ScanSession>();
let indexedActiveSession: ScanSession | null = null;
let indexedFallbackActive = false;

function mergeHistory(primary: HistoryItem[], secondary: HistoryItem[]): HistoryItem[] {
  const seen = new Set<string>();
  return [...primary, ...secondary]
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, PRO_HISTORY_RECORD_LIMIT);
}

export async function hydratePersistentStorage(): Promise<void> {
  const [storedHistory, storedActive] = await Promise.all([
    readIndexedRecord<HistoryItem[]>(INDEXED_HISTORY_KEY),
    readIndexedRecord<ScanSession>(INDEXED_ACTIVE_SESSION_KEY),
  ]);

  if (Array.isArray(storedHistory)) {
    indexedFallbackActive = true;
    indexedHistory = storedHistory;
    const sessions = await Promise.all(
      storedHistory.map((item) =>
        readIndexedRecord<ScanSession>(`${INDEXED_SESSION_PREFIX}${item.id}`),
      ),
    );
    sessions.forEach((session) => {
      if (session) indexedSessions.set(session.id, session);
    });
  }
  indexedActiveSession = storedActive;
}

export function getLastSaveFailure(): SaveFailure | null {
  return lastSaveFailure;
}

export function waitForLastSaveFailureReport(): Promise<boolean> {
  return lastSaveFailureReport ?? Promise.resolve(false);
}

function storageUsageChars(): number {
  let total = 0;
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith('vialscreen:')) {
        total += key.length + (localStorage.getItem(key)?.length ?? 0);
      }
    }
  } catch {
    return -1;
  }
  return total;
}

function recordSaveFailure(stage: SaveFailureStage, error: unknown): void {
  const errorName = error instanceof Error ? error.name : typeof error;
  const kind: SaveFailureKind =
    errorName === 'QuotaExceededError'
      ? 'quota'
      : error instanceof TypeError
        ? 'serialization'
        : 'write';
  lastSaveFailure = { stage, kind, errorName };
  lastSaveFailureReport = captureSaveFailureDiagnostic({
    stage,
    kind,
    errorName,
    storageChars: storageUsageChars(),
  });
}

function compactThumbnail(value: unknown): string | null {
  return typeof value === 'string' && value.length <= MAX_PERSISTED_THUMBNAIL_CHARS
    ? value
    : null;
}

function compactSession(session: ScanSession): ScanSession {
  let remainingThumbnailChars = MAX_SESSION_THUMBNAIL_CHARS;
  return {
    ...session,
    captures: session.captures.map((capture) => {
      const thumbnail = compactThumbnail(capture.thumbDataUrl);
      const keepThumbnail = thumbnail !== null && thumbnail.length <= remainingThumbnailChars;
      if (keepThumbnail) remainingThumbnailChars -= thumbnail.length;
      return {
        ...capture,
        dataUrl: '',
        thumbDataUrl: keepThumbnail ? thumbnail : undefined,
      };
    }),
  };
}

/**
 * Replace an oversized legacy value without temporarily requiring room for
 * both the old and new strings. iOS WKWebView can reject setItem for a smaller
 * replacement while localStorage is already at quota, so remove first and then
 * write the compacted value. Restore the original best-effort if the compacted
 * write unexpectedly fails.
 */
function replaceWithCompactedValue(key: string, raw: string, compacted: string): void {
  if (compacted === raw) return;

  localStorage.removeItem(key);
  try {
    localStorage.setItem(key, compacted);
  } catch (error) {
    try { localStorage.setItem(key, raw); } catch { /* best-effort rollback */ }
    throw error;
  }
}

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
  if (indexedFallbackActive) return indexedHistory;

  let localHistory: HistoryItem[] = [];
  try {
    const raw = localStorage.getItem(KEYS.SCAN_HISTORY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localHistory = parsed.filter(
          (item): item is HistoryItem =>
            item !== null &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.createdAt === 'string' &&
            typeof item.triageResult === 'string' &&
            typeof item.overallConfidence === 'number',
        );
      }
    }
  } catch {
    // Fall through to the IndexedDB copy.
  }
  return mergeHistory(localHistory, indexedHistory);
}

export function addToHistory(session: ScanSession): boolean {
  try {
    const history = getScanHistory();

    // Use the small capture thumbnail — NEVER the full-resolution dataUrl.
    // A full-res base64 frame is 200 KB–2 MB; storing one per history item
    // exhausts the ~5 MB localStorage quota after only a few scans.
    const thumb = compactThumbnail(
      session.captures.find((c) => c.thumbDataUrl)?.thumbDataUrl,
    );

    const item: HistoryItem = {
      id: session.id,
      createdAt: session.createdAt,
      triageResult: session.analysisResult?.triageResult ?? 'review',
      peptideName: session.metadata.peptideName || 'Unnamed Vial',
      vendor: session.metadata.vendor || '',
      overallConfidence: session.analysisResult?.overallConfidence ?? 0,
      assessmentOutcome: session.analysisResult?.assessmentOutcome ?? 'assessed',
      thumbnailDataUrl: thumb,
      appearanceProfile: session.metadata.appearanceProfile ?? null,
      scanMode: session.metadata.scanMode,
    };

    // Prepend (newest first), keep the documented on-device record limit.
    const updated = [item, ...history.filter((h) => h.id !== session.id)];
    const kept = updated.slice(0, PRO_HISTORY_RECORD_LIMIT);
    localStorage.setItem(KEYS.SCAN_HISTORY, JSON.stringify(kept));

    // Only prune detail records after the new history index is safely written.
    // Otherwise a quota error could delete valid details and still fail to add
    // the new item.
    for (const dropped of updated.slice(PRO_HISTORY_RECORD_LIMIT)) {
      try { localStorage.removeItem(sessionKey(dropped.id)); } catch { /* ignore */ }
    }
    return true;
  } catch (error) {
    recordSaveFailure('history', error);
    console.warn('[VialScreen] Could not write history entry.', error);
    return false;
  }
}

async function saveFinalizedSessionToIndexedDb(session: ScanSession): Promise<boolean> {
  const compactedSession = compactSession(session);
  const thumb = compactThumbnail(
    compactedSession.captures.find((capture) => capture.thumbDataUrl)?.thumbDataUrl,
  );
  const historyItem: HistoryItem = {
    id: session.id,
    createdAt: session.createdAt,
    triageResult: session.analysisResult?.triageResult ?? 'review',
    peptideName: session.metadata.peptideName || 'Unnamed Vial',
    vendor: session.metadata.vendor || '',
    overallConfidence: session.analysisResult?.overallConfidence ?? 0,
    assessmentOutcome: session.analysisResult?.assessmentOutcome ?? 'assessed',
    thumbnailDataUrl: thumb,
    appearanceProfile: session.metadata.appearanceProfile ?? null,
    scanMode: session.metadata.scanMode,
  };
  const current = getScanHistory();
  const uncapped = [historyItem, ...current.filter((item) => item.id !== session.id)];
  const history = uncapped.slice(0, PRO_HISTORY_RECORD_LIMIT);
  const dropped = uncapped.slice(PRO_HISTORY_RECORD_LIMIT);
  const sessions = history.flatMap((item) => {
    const retainedSession = item.id === session.id
      ? compactedSession
      : loadSession(item.id);
    return retainedSession
      ? [{
          key: `${INDEXED_SESSION_PREFIX}${item.id}`,
          value: compactSession(retainedSession),
        }]
      : [];
  });
  const saved = await replaceIndexedHistory({
    historyKey: INDEXED_HISTORY_KEY,
    history,
    sessions,
    deleteSessionKeys: dropped.map((item) => `${INDEXED_SESSION_PREFIX}${item.id}`),
  });
  if (!saved) return false;

  indexedSessions.clear();
  for (const retained of sessions) indexedSessions.set(retained.value.id, retained.value);
  for (const item of dropped) indexedSessions.delete(item.id);
  indexedHistory = history;
  indexedFallbackActive = true;
  return true;
}

/**
 * Return all history items whose peptideName matches `name` (case-insensitive).
 * Pass `scanMode` to restrict to scans of the same type (liquid vs powder) —
 * important for baseline comparison so powder scans only compare with powder.
 */
export function getHistoryForSampleName(name: string, scanMode?: ScanMode): HistoryItem[] {
  if (!name.trim()) return [];
  const normalized = name.trim().toLowerCase();
  return getScanHistory().filter(
    (h) =>
      (h.peptideName ?? '').trim().toLowerCase() === normalized &&
      (scanMode === undefined || (h.scanMode ?? 'reconstituted') === scanMode),
  );
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
  if (indexedFallbackActive) {
    const previousHistory = indexedHistory;
    const previousSessions = new Map(indexedSessions);
    indexedHistory = [];
    indexedSessions.clear();
    try {
      const keys: string[] = [];
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (key?.startsWith(SESSION_KEY_PREFIX)) keys.push(key);
      }
      localStorage.removeItem(KEYS.SCAN_HISTORY);
      for (const key of keys) localStorage.removeItem(key);
    } catch {
      // IndexedDB remains authoritative even if Web Storage rejects cleanup.
    }
    void clearIndexedHistory(INDEXED_HISTORY_KEY, INDEXED_SESSION_PREFIX).then((cleared) => {
      if (cleared) return;
      indexedHistory = previousHistory;
      indexedSessions.clear();
      previousSessions.forEach((session, id) => indexedSessions.set(id, session));
    });
    return;
  }

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
  return `${SESSION_KEY_PREFIX}${id}`;
}

/** Returns true if saved successfully, false if storage quota was exceeded. */
export function saveSession(session: ScanSession): boolean {
  try {
    // Strip image dataUrls before persisting — base64 images are 200 KB–2 MB each
    // and quickly exhaust localStorage's ~5 MB quota. Analysis results, metadata,
    // and the history thumbnail (stored separately) are preserved.
    const lean = compactSession(session);
    localStorage.setItem(sessionKey(session.id), JSON.stringify(lean));
    return true;
  } catch (e) {
    recordSaveFailure('detail', e);
    console.warn('[VialScreen] Could not save session:', e);
    return false;
  }
}

/**
 * Recover space consumed by older PepScan builds.
 *
 * Legacy history rows could contain a full camera image as their thumbnail,
 * and legacy session records retained every full-resolution capture. Updating
 * the app does not rewrite those existing localStorage values, so they can keep
 * iOS WKWebView over quota indefinitely.
 *
 * This repair preserves all valid history summaries, compact thumbnails, and
 * referenced session details. It removes only obsolete image payloads and
 * orphaned detail records. `preserveSessionIds` protects a newly written detail
 * record while its history-index write is being retried.
 */
export function repairLegacyStorage(preserveSessionIds: string[] = []): void {
  const preserveIds = new Set(preserveSessionIds);
  const retainedIds = new Set<string>();
  let canPruneOrphans = true;
  let rawHistory: string | null = null;
  let compactedHistory: string | null = null;

  try {
    rawHistory = localStorage.getItem(KEYS.SCAN_HISTORY);
    if (rawHistory) {
      const parsed = JSON.parse(rawHistory);
      if (Array.isArray(parsed)) {
        const seenIds = new Set<string>();
        const compacted = parsed
          .filter((item): item is HistoryItem =>
            item !== null &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.createdAt === 'string' &&
            typeof item.triageResult === 'string' &&
            typeof item.overallConfidence === 'number')
          .filter((item) => {
            if (seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
          })
          .slice(0, PRO_HISTORY_RECORD_LIMIT)
          .map((item) => {
            retainedIds.add(item.id);
            return {
              ...item,
              thumbnailDataUrl: compactThumbnail(item.thumbnailDataUrl),
            };
          });
        compactedHistory = JSON.stringify(compacted);
      } else {
        canPruneOrphans = false;
      }
    }
  } catch (error) {
    // Continue with session cleanup even if a malformed history index cannot
    // be compacted. Never replace an unreadable index with an empty one.
    canPruneOrphans = false;
    console.warn('[VialScreen] Could not compact legacy history.', error);
  }

  const keys: string[] = [];
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key) keys.push(key);
    }
  } catch {
    return;
  }

  // Delete only confirmed orphans first. When the store is already over quota,
  // WebKit may reject even a smaller replacement value until a key is removed.
  for (const key of keys) {
    if (!key.startsWith(SESSION_KEY_PREFIX)) continue;
    const id = key.slice(SESSION_KEY_PREFIX.length);

    if (canPruneOrphans && !retainedIds.has(id) && !preserveIds.has(id)) {
      try { localStorage.removeItem(key); } catch { /* best-effort cleanup */ }
    }
  }

  try {
    if (compactedHistory !== null && compactedHistory !== rawHistory) {
      replaceWithCompactedValue(KEYS.SCAN_HISTORY, rawHistory ?? '', compactedHistory);
    }
  } catch (error) {
    console.warn('[VialScreen] Could not write compacted legacy history.', error);
  }

  for (const key of keys) {
    if (!key.startsWith(SESSION_KEY_PREFIX)) continue;
    const id = key.slice(SESSION_KEY_PREFIX.length);
    if (canPruneOrphans && !retainedIds.has(id) && !preserveIds.has(id)) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as ScanSession;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.captures)) continue;
      const compacted = JSON.stringify(compactSession(parsed));
      replaceWithCompactedValue(key, raw, compacted);
    } catch (error) {
      console.warn('[VialScreen] Could not compact a legacy session.', error);
    }
  }

  // The active record is not referenced by the history index. Compact it, but
  // never delete it: it may be the user's only copy of an unsaved result.
  try {
    const rawActive = localStorage.getItem(KEYS.ACTIVE_SESSION);
    if (rawActive) {
      const parsed = JSON.parse(rawActive) as ScanSession;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.captures)) {
        const compacted = JSON.stringify(compactSession(parsed));
        replaceWithCompactedValue(KEYS.ACTIVE_SESSION, rawActive, compacted);
      }
    }
  } catch (error) {
    console.warn('[VialScreen] Could not compact the active session.', error);
  }
}

function trySaveFinalizedSession(session: ScanSession): boolean {
  if (!saveSession(session)) return false;
  return addToHistory(session);
}

function rawSessionId(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { id?: unknown };
    return typeof parsed?.id === 'string' ? parsed.id : null;
  } catch {
    return null;
  }
}

function restoreRawValue(key: string, raw: string | null): void {
  try {
    localStorage.removeItem(key);
    if (raw !== null) localStorage.setItem(key, raw);
  } catch {
    // Best effort. The caller persists the pending active session immediately
    // after a failed finalized save.
  }
}

/**
 * Persist a completed record, repairing legacy storage and retrying once before
 * reporting a failure. Success requires both the detail record and history row.
 */
export async function saveFinalizedSession(session: ScanSession): Promise<boolean> {
  if (indexedFallbackActive) return saveFinalizedSessionToIndexedDb(session);

  // Repair first. Waiting for a failed write is unreliable on WKWebView: a
  // store filled by legacy image payloads may reject even a smaller overwrite.
  repairLegacyStorage([session.id]);

  const detailKey = sessionKey(session.id);
  const previousDetail = localStorage.getItem(detailKey);
  const activeRaw = localStorage.getItem(KEYS.ACTIVE_SESSION);
  const stagedActive = rawSessionId(activeRaw) === session.id ? activeRaw : null;

  // The finalized detail is nearly the same payload as the active session.
  // Keeping both during the write temporarily doubles the required space and
  // makes a nearly-full WKWebView reject the detail before we can clear active.
  // Stage the active value in memory, release its quota, and restore it below
  // if either the detail or History write still fails.
  if (stagedActive !== null) {
    localStorage.removeItem(KEYS.ACTIVE_SESSION);
  }

  lastSaveFailure = null;
  lastSaveFailureReport = null;
  if (trySaveFinalizedSession(session)) return true;

  // A concurrent/best-effort write may have consumed space after preflight.
  repairLegacyStorage([session.id]);
  if (trySaveFinalizedSession(session)) return true;

  // A History-stage failure may have left a new detail record behind. Roll it
  // back before restoring the active result so the user's only retryable copy
  // cannot itself be lost to quota pressure.
  restoreRawValue(detailKey, previousDetail);
  if (stagedActive !== null) {
    restoreRawValue(KEYS.ACTIVE_SESSION, stagedActive);
  }
  if (await saveFinalizedSessionToIndexedDb(session)) return true;
  return false;
}

export function loadSession(id: string): ScanSession | null {
  if (indexedFallbackActive) return indexedSessions.get(id) ?? null;

  try {
    const raw = localStorage.getItem(sessionKey(id));
    if (!raw) return indexedSessions.get(id) ?? null;
    const parsed = JSON.parse(raw);
    // Basic shape validation — guard against corrupted or migrated data
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.id !== 'string' ||
      !Array.isArray(parsed.captures)
    ) {
      return indexedSessions.get(id) ?? null;
    }
    return parsed as ScanSession;
  } catch {
    return indexedSessions.get(id) ?? null;
  }
}

export function deleteSession(id: string): void {
  if (indexedFallbackActive) {
    const previousHistory = indexedHistory;
    const previousSession = indexedSessions.get(id);
    const history = indexedHistory.filter((item) => item.id !== id);
    indexedHistory = history;
    indexedSessions.delete(id);
    void deleteIndexedSessionAndWriteHistory({
      sessionKey: `${INDEXED_SESSION_PREFIX}${id}`,
      historyKey: INDEXED_HISTORY_KEY,
      history,
    }).then((saved) => {
      if (saved) return;
      indexedHistory = previousHistory;
      if (previousSession) indexedSessions.set(id, previousSession);
    });
    return;
  }

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
  const lean = compactSession(session);
  try {
    // Strip full-resolution dataUrls before persisting — an in-progress session
    // can have 2–3 captures at 800px JPEG (≈200–400 KB each as base64).
    // Parsing that back synchronously on next launch can stall the main thread
    // long enough to trigger an Android ANR. The thumbnail is kept so the
    // resume banner can show a preview; the full images are re-captured anyway.
    localStorage.setItem(KEYS.ACTIVE_SESSION, JSON.stringify(lean));
  } catch {
    // Fall through to the IndexedDB copy below.
  }
  indexedActiveSession = lean;
  void writeIndexedRecord(INDEXED_ACTIVE_SESSION_KEY, lean);
}

export function loadActiveSession(): ScanSession | null {
  if (indexedFallbackActive) return indexedActiveSession;

  try {
    const raw = localStorage.getItem(KEYS.ACTIVE_SESSION);
    if (!raw) return indexedActiveSession;
    const parsed = JSON.parse(raw);
    // Same shape validation as loadSession — guard against corrupted data
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.id !== 'string' ||
      !Array.isArray(parsed.captures)
    ) {
      return indexedActiveSession;
    }
    return parsed as ScanSession;
  } catch {
    return indexedActiveSession;
  }
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(KEYS.ACTIVE_SESSION);
  } catch {
    // ignore
  }
  indexedActiveSession = null;
  void deleteIndexedRecord(INDEXED_ACTIVE_SESSION_KEY);
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
export async function importExportPayload(
  payload: unknown,
): Promise<{ imported: number; skipped: number }> {
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

  const sessionsById = new Map(
    (Array.isArray(p.sessions) ? p.sessions : [])
      .filter((s): s is ScanSession => Boolean(s) && typeof s.id === 'string')
      .map((s) => [s.id, compactSession(s)]),
  );

  if (indexedFallbackActive) {
    const importedSessions = importedItems.flatMap((item) => {
      const session = sessionsById.get(item.id);
      return session
        ? [{ key: `${INDEXED_SESSION_PREFIX}${item.id}`, value: session }]
        : [];
    });
    const saved = await replaceIndexedHistory({
      historyKey: INDEXED_HISTORY_KEY,
      history: retained,
      sessions: importedSessions,
      deleteSessionKeys: dropped.map((item) => `${INDEXED_SESSION_PREFIX}${item.id}`),
    });
    if (!saved) {
      throw new Error('Not enough storage space to import this backup. Delete some scans and try again.');
    }
    indexedHistory = retained;
    for (const { value } of importedSessions) indexedSessions.set(value.id, value);
    for (const item of dropped) indexedSessions.delete(item.id);
    return { imported: importedItems.length, skipped };
  }

  // Commit the history list first — if this throws (quota), no session
  // records have been written yet, so storage is left exactly as it was.
  try {
    localStorage.setItem(KEYS.SCAN_HISTORY, JSON.stringify(retained));
  } catch {
    throw new Error('Not enough storage space to import this backup. Delete some scans and try again.');
  }

  // Session detail records: only for imports that made the cut (best-effort —
  // a quota failure here loses only the detail view, not the history row).
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
      reconstitutedAt: null,
    },
    captures: [],
    analysisResult: null,
    finalized: false,
  };
}
