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
  localStorage.setItem(KEYS.ONBOARDING, JSON.stringify(state));
}

export function resetOnboarding(): void {
  localStorage.removeItem(KEYS.ONBOARDING);
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
  const history = getScanHistory();

  // Build a thumbnail from first capture
  const thumb = session.captures[0]?.dataUrl ?? null;

  const item: HistoryItem = {
    id: session.id,
    createdAt: session.createdAt,
    triageResult: session.analysisResult?.triageResult ?? 'review',
    peptideName: session.metadata.peptideName || 'Unnamed Vial',
    vendor: session.metadata.vendor || '',
    overallConfidence: session.analysisResult?.overallConfidence ?? 0,
    thumbnailDataUrl: thumb,
  };

  // Prepend (newest first), keep max 100 items
  const updated = [item, ...history.filter((h) => h.id !== session.id)].slice(0, 100);
  localStorage.setItem(KEYS.SCAN_HISTORY, JSON.stringify(updated));
}

export function removeFromHistory(id: string): void {
  const history = getScanHistory().filter((h) => h.id !== id);
  localStorage.setItem(KEYS.SCAN_HISTORY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(KEYS.SCAN_HISTORY);
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
    localStorage.setItem(sessionKey(session.id), JSON.stringify(session));
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
  localStorage.removeItem(sessionKey(id));
  removeFromHistory(id);
}

// ----------------------------------------------------------------
// Active Session (in-progress scan — for accidental close recovery)
// ----------------------------------------------------------------

export function saveActiveSession(session: ScanSession): void {
  try {
    localStorage.setItem(KEYS.ACTIVE_SESSION, JSON.stringify(session));
  } catch {
    // quota exceeded — skip
  }
}

export function loadActiveSession(): ScanSession | null {
  try {
    const raw = localStorage.getItem(KEYS.ACTIVE_SESSION);
    if (!raw) return null;
    return JSON.parse(raw) as ScanSession;
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  localStorage.removeItem(KEYS.ACTIVE_SESSION);
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
    },
    captures: [],
    analysisResult: null,
    finalized: false,
  };
}
