/**
 * VialScreen — Scan Session State Hook
 *
 * Central hook managing the active scan session lifecycle.
 * Persists to localStorage on every change.
 */

import { useState, useCallback, useRef } from 'react';
import type { ScanSession, MediaCapture, ScanMetadata, CaptureBackground, AnalysisResult } from '../types';
import { SCAN_STEPS, type ScanStep } from '../types';
import {
  createNewSession,
  saveSession,
  saveActiveSession,
  clearActiveSession,
  addToHistory,
  generateId,
} from '../utils/storage';
import { runAnalysis } from '../analysis/engine';

export interface UseScanSession {
  session: ScanSession | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  /** Live status message during analysis — updates as the engine progresses. */
  analysisStatus: string;

  startNewSession(): void;
  resumeSession(session: ScanSession): void;
  abandonSession(): void;

  updateMetadata(metadata: Partial<ScanMetadata>): void;

  addCapture(capture: Omit<MediaCapture, 'id' | 'capturedAt'>): void;
  removeCapture(background: CaptureBackground): void;
  getCaptureForBackground(background: CaptureBackground): MediaCapture | undefined;

  advanceStep(): void;
  goToStep(step: ScanStep): void;
  currentStep: ScanStep | null;
  stepIndex: number;

  runHeuristicAnalysis(): Promise<void>;

  /**
   * Finalize the session — attempts to persist to localStorage and history.
   * Returns true if saved successfully, false if storage quota was exceeded.
   *
   * On failure, the session is preserved as the active session with
   * pendingSave: true so the user can navigate away to free storage and
   * return to retry. The active session is NOT cleared on failure.
   */
  finalizeSession(): boolean;

  /**
   * Retry saving an already-finalized session.
   * Call after the user frees up storage space.
   * Returns true on success, false on failure.
   * On success, clears the active session from storage.
   */
  retrySave(): boolean;
}

export function useScanSession(): UseScanSession {
  const [session, setSession] = useState<ScanSession | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState('');
  // sessionRef always holds the latest session for synchronous reads
  // (avoids stale-closure issues in callbacks)
  const sessionRef = useRef<ScanSession | null>(null);

  const persistSession = useCallback((s: ScanSession) => {
    const updated = { ...s, updatedAt: new Date().toISOString() };
    sessionRef.current = updated;
    setSession(updated);
    saveActiveSession(updated);
  }, []);

  const startNewSession = useCallback(() => {
    const s = createNewSession();
    persistSession(s);
  }, [persistSession]);

  const resumeSession = useCallback(
    (s: ScanSession) => {
      persistSession(s);
    },
    [persistSession],
  );

  const abandonSession = useCallback(() => {
    clearActiveSession();
    sessionRef.current = null;
    setSession(null);
  }, []);

  const updateMetadata = useCallback(
    (metadata: Partial<ScanMetadata>) => {
      setSession((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          metadata: { ...prev.metadata, ...metadata },
          updatedAt: new Date().toISOString(),
        };
        saveActiveSession(updated);
        return updated;
      });
    },
    [],
  );

  const addCapture = useCallback(
    (capture: Omit<MediaCapture, 'id' | 'capturedAt'>) => {
      setSession((prev) => {
        if (!prev) return prev;
        const newCapture: MediaCapture = {
          ...capture,
          id: generateId(),
          capturedAt: new Date().toISOString(),
        };
        // Replace existing capture for same background
        const captures = [
          ...prev.captures.filter((c) => c.background !== capture.background),
          newCapture,
        ];
        const updated = { ...prev, captures, updatedAt: new Date().toISOString() };
        saveActiveSession(updated);
        return updated;
      });
    },
    [],
  );

  const removeCapture = useCallback((background: CaptureBackground) => {
    setSession((prev) => {
      if (!prev) return prev;
      const captures = prev.captures.filter((c) => c.background !== background);
      const updated = { ...prev, captures, updatedAt: new Date().toISOString() };
      saveActiveSession(updated);
      return updated;
    });
  }, []);

  const getCaptureForBackground = useCallback(
    (background: CaptureBackground): MediaCapture | undefined => {
      return session?.captures.find((c) => c.background === background);
    },
    [session],
  );

  const currentStep: ScanStep | null = session
    ? SCAN_STEPS[Math.min(session.currentStep, SCAN_STEPS.length - 1)]
    : null;

  const stepIndex = session ? Math.min(session.currentStep, SCAN_STEPS.length - 1) : 0;

  const advanceStep = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const nextStep = Math.min(prev.currentStep + 1, SCAN_STEPS.length - 1);
      const updated = { ...prev, currentStep: nextStep, updatedAt: new Date().toISOString() };
      saveActiveSession(updated);
      return updated;
    });
  }, []);

  const goToStep = useCallback((step: ScanStep) => {
    const idx = SCAN_STEPS.indexOf(step);
    if (idx === -1) return;
    setSession((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, currentStep: idx, updatedAt: new Date().toISOString() };
      saveActiveSession(updated);
      return updated;
    });
  }, []);

  const runHeuristicAnalysis = useCallback(async () => {
    const current = sessionRef.current ?? session;
    if (!current) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // ── Phase 1: heuristic engine (always runs) ──────────────
      const result: AnalysisResult = await runAnalysis(
        current.captures,
        current.metadata.peptideName || undefined,
        (phase) => setAnalysisStatus(phase),
        current.metadata.appearanceProfile ?? null,
        current.metadata.scanMode ?? 'reconstituted',
      );

      // ── Phase 2: AI Vision (best-effort, non-blocking) ───────
      setAnalysisStatus('Running AI Vision analysis…');
      let aiResult: import('../utils/visionAnalysis').AIVisionResult | null = null;
      try {
        const { runVisionAnalysis } = await import('../utils/visionAnalysis');
        aiResult = await runVisionAnalysis({
          captures: current.captures,
          peptideName: current.metadata.peptideName || null,
          scanMode: current.metadata.scanMode ?? 'reconstituted',
          appearanceProfile: current.metadata.appearanceProfile ?? null,
        });
      } catch {
        // AI vision is best-effort — fall back to heuristic only
      }

      // ── Phase 3: merge ────────────────────────────────────────
      let finalResult = result;
      if (aiResult) {
        const { mergeVerdicts } = await import('../utils/visionAnalysis');
        const merged = mergeVerdicts(
          { triage: result.triageResult, confidence: result.overallConfidence },
          aiResult,
        );

        // Prepend unique AI findings not already in primaryReasons
        const existingLower = result.primaryReasons.map((r) => r.toLowerCase());
        const newFindings = aiResult.primaryFindings.filter(
          (f) => !existingLower.some((e) => e.includes(f.toLowerCase().slice(0, 20))),
        );

        finalResult = {
          ...result,
          triageResult: merged.triage,
          overallConfidence: merged.confidence,
          primaryReasons: [...newFindings, ...result.primaryReasons],
          aiEnhanced: true,
          aiFindings: newFindings,
        };
      }

      setSession((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          analysisResult: finalResult,
          updatedAt: new Date().toISOString(),
        };
        sessionRef.current = updated;
        saveActiveSession(updated);
        return updated;
      });
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  }, [session]);

  const finalizeSession = useCallback((): boolean => {
    // Use sessionRef for synchronous access (avoids stale closure in setSession updater)
    const current = sessionRef.current ?? session;
    if (!current) return false;

    const finalized: ScanSession = {
      ...current,
      finalized: true,
      pendingSave: undefined, // clear any old pending flag before attempting save
      updatedAt: new Date().toISOString(),
    };

    // Attempt to persist to localStorage — returns false if quota exceeded
    const saved = saveSession(finalized);

    if (saved) {
      // Only write the history index entry if the full session blob was saved
      addToHistory(finalized);
      // Clear active session — save was successful
      clearActiveSession();
    } else {
      // Save failed. Preserve the finalized session as active session with
      // pendingSave: true so the user can navigate away, free storage,
      // and return to retry without losing their result.
      const pending: ScanSession = { ...finalized, pendingSave: true };
      saveActiveSession(pending);
      sessionRef.current = pending;
      setSession(pending);
      return false;
    }

    // Update React state on success
    sessionRef.current = finalized;
    setSession(finalized);

    return true;
  }, [session]);

  const retrySave = useCallback((): boolean => {
    // Re-attempt saving an already-finalized session (e.g., after user freed storage)
    const current = sessionRef.current ?? session;
    if (!current || !current.finalized) return false;

    // Strip the pendingSave marker before saving
    const toSave: ScanSession = { ...current, pendingSave: undefined };
    const saved = saveSession(toSave);

    if (saved) {
      addToHistory(toSave);
      clearActiveSession(); // Session is now properly saved — remove from active
      sessionRef.current = toSave;
      setSession(toSave);
    }

    return saved;
  }, [session]);

  return {
    session,
    isAnalyzing,
    analysisError,
    analysisStatus,
    startNewSession,
    resumeSession,
    abandonSession,
    updateMetadata,
    addCapture,
    removeCapture,
    getCaptureForBackground,
    advanceStep,
    goToStep,
    currentStep,
    stepIndex,
    runHeuristicAnalysis,
    finalizeSession,
    retrySave,
  };
}
