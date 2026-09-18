/**
 * VialScreen — Scan Session State Hook
 *
 * Central hook managing the active scan session lifecycle.
 * Persists to localStorage on every change.
 */

import { useState, useCallback, useRef } from 'react';
import type {
  ScanSession,
  MediaCapture,
  ScanMetadata,
  CaptureBackground,
  AnalysisResult,
  CaptureQualityBlocker,
} from '../types';
import { SCAN_STEPS, type ScanStep } from '../types';
import {
  createNewSession,
  saveFinalizedSession,
  saveActiveSession,
  clearActiveSession,
  generateId,
  getLastSaveFailure,
  waitForLastSaveFailureReport,
} from '../utils/storage';
import { runAnalysis } from '../analysis/engine';
import { trackScanComplete } from '../lib/analytics';
import { setScanContext, withSpan, breadcrumbStep, addBreadcrumb } from '../lib/sentry';

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
  /**
   * Clears only the capture(s) that prevented assessment, preserves all scan
   * context, and returns to the earliest affected capture step.
   */
  retakeForQuality(blockers: CaptureQualityBlocker[]): void;

  advanceStep(): void;
  goToStep(step: ScanStep): void;
  currentStep: ScanStep | null;
  stepIndex: number;

  runHeuristicAnalysis(opts?: {
    includeAiVision?: boolean;
    /** Pro baseline-comparison: findings from previous scans of the same sample. */
    baselineContext?: string[];
    /** How many previous sessions contributed to baselineContext. */
    baselineScanCount?: number;
  }): Promise<void>;

  /**
   * Finalize the session — attempts to persist to localStorage and history.
   * Returns true if saved successfully, false if storage quota was exceeded.
   *
   * On failure, the session is preserved as the active session with
   * pendingSave: true so the user can navigate away to free storage and
   * return to retry. The active session is NOT cleared on failure.
   */
  finalizeSession(): Promise<boolean>;

  /**
   * Retry saving an already-finalized session.
   * Call after the user frees up storage space.
   * Returns true on success, false on failure.
   * On success, clears the active session from storage.
   */
  retrySave(): Promise<boolean>;
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

  const retakeForQuality = useCallback((blockers: CaptureQualityBlocker[]) => {
    const affected = new Set(blockers.map((blocker) => blocker.background));
    if (affected.size === 0) return;
    const nextStep: ScanStep = affected.has('white') ? 'white-capture' : 'black-capture';

    setSession((prev) => {
      if (!prev) return prev;
      const updated: ScanSession = {
        ...prev,
        captures: prev.captures.filter(
          (capture) => !(capture.background === 'white' || capture.background === 'black') ||
            !affected.has(capture.background),
        ),
        analysisResult: null,
        finalized: false,
        pendingSave: undefined,
        currentStep: SCAN_STEPS.indexOf(nextStep),
        updatedAt: new Date().toISOString(),
      };
      sessionRef.current = updated;
      breadcrumbStep(nextStep, 'enter');
      saveActiveSession(updated);
      return updated;
    });
  }, []);

  const currentStep: ScanStep | null = session
    ? SCAN_STEPS[Math.min(session.currentStep, SCAN_STEPS.length - 1)]
    : null;

  const stepIndex = session ? Math.min(session.currentStep, SCAN_STEPS.length - 1) : 0;

  const advanceStep = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const nextStep = Math.min(prev.currentStep + 1, SCAN_STEPS.length - 1);
      breadcrumbStep(SCAN_STEPS[nextStep] ?? 'end', 'enter');
      const updated = { ...prev, currentStep: nextStep, updatedAt: new Date().toISOString() };
      saveActiveSession(updated);
      return updated;
    });
  }, []);

  const goToStep = useCallback((step: ScanStep) => {
    const idx = SCAN_STEPS.indexOf(step);
    if (idx === -1) return;
    breadcrumbStep(step, 'enter');
    setSession((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, currentStep: idx, updatedAt: new Date().toISOString() };
      saveActiveSession(updated);
      return updated;
    });
  }, []);

  const runHeuristicAnalysis = useCallback(async (opts?: {
    includeAiVision?: boolean;
    baselineContext?: string[];
    baselineScanCount?: number;
  }) => {
    const current = sessionRef.current ?? session;
    if (!current) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // ── Phase 1: heuristic engine (always runs) ──────────────
      addBreadcrumb('Analysis started', {
        profile: current.metadata.appearanceProfile ?? 'none',
        scan_mode: current.metadata.scanMode ?? 'reconstituted',
        captures: current.captures.length,
        ai_requested: opts?.includeAiVision ?? false,
      });

      const result: AnalysisResult = await withSpan('analysis', 'heuristic_engine', () =>
        runAnalysis(
          current.captures,
          current.metadata.peptideName || undefined,
          (phase) => setAnalysisStatus(phase),
          current.metadata.appearanceProfile ?? null,
          current.metadata.scanMode ?? 'reconstituted',
        ),
      );

      addBreadcrumb('Heuristic engine complete', {
        verdict: result.triageResult,
        confidence: result.overallConfidence,
      });

      // ── Phase 2: additional visual analysis (Pro only, best-effort) ───────────
      setAnalysisStatus(opts?.includeAiVision ? 'Reviewing additional visual factors…' : '');
      let aiResult: import('../utils/visionAnalysis').AIVisionResult | null = null;
      // An unreliable required capture is not a candidate for an enhanced
      // visual verdict. Do not send it to the optional vision service and do
      // not allow that service to turn an unavailable assessment into a result.
      if (opts?.includeAiVision && result.assessmentOutcome !== 'unable-to-assess') try {
        const { runVisionAnalysis } = await import('../utils/visionAnalysis');
        aiResult = await withSpan('analysis', 'ai_vision', () =>
          runVisionAnalysis({
            captures: current.captures,
            peptideName: current.metadata.peptideName || null,
            scanMode: current.metadata.scanMode ?? 'reconstituted',
            appearanceProfile: current.metadata.appearanceProfile ?? null,
            baselineContext: opts?.baselineContext?.length ? opts.baselineContext : undefined,
            reconstitutedAt: current.metadata.reconstitutedAt ?? null,
          }),
        );
        addBreadcrumb('AI vision complete', {
          ai_verdict: aiResult?.overallVerdict,
          ai_confidence: aiResult?.confidence,
        });
      } catch (err) {
        addBreadcrumb('AI vision failed (best-effort fallback)', {}, 'error' as const);
        import('../lib/sentry').then(({ captureError }) => {
          captureError(err, { context: 'ai-vision-analysis' });
        }).catch(() => {});
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

      // Baseline comparison: tag the result so the UI can show the indicator
      if (
        opts?.baselineContext?.length &&
        opts.baselineScanCount &&
        current.metadata.peptideName?.trim()
      ) {
        finalResult = {
          ...finalResult,
          baselineUsed: {
            sampleName: current.metadata.peptideName.trim(),
            previousScanCount: opts.baselineScanCount,
          },
        };
      }

      // Fire analytics + Sentry context now that we have a result
      trackScanComplete({
        verdict: finalResult.triageResult,
        confidence: finalResult.overallConfidence,
        profile: current.metadata.appearanceProfile ?? null,
        scanMode: current.metadata.scanMode ?? 'reconstituted',
        aiEnhanced: finalResult.aiEnhanced ?? false,
        hasBaseline: !!(opts?.baselineContext?.length),
        reconstitutedAt: current.metadata.reconstitutedAt ?? null,
      });
      setScanContext({
        verdict: finalResult.triageResult,
        profile: current.metadata.appearanceProfile ?? null,
        confidence: finalResult.overallConfidence,
        aiEnhanced: finalResult.aiEnhanced ?? false,
        scanMode: current.metadata.scanMode ?? 'reconstituted',
      });

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

  const finalizeSession = useCallback(async (): Promise<boolean> => {
    // Use sessionRef for synchronous access (avoids stale closure in setSession updater)
    const current = sessionRef.current ?? session;
    if (!current) return false;

    const finalized: ScanSession = {
      ...current,
      finalized: true,
      pendingSave: undefined, // clear any old pending flag before attempting save
      pendingSaveFailure: undefined,
      updatedAt: new Date().toISOString(),
    };

    // Save both the detail record and history row. The storage layer compacts
    // legacy image payloads and retries once before reporting a failure.
    const saved = await saveFinalizedSession(finalized);

    if (saved) {
      // Clear active session — save was successful
      clearActiveSession();
    } else {
      // Save failed. Preserve the finalized session as active session with
      // pendingSave: true so the user can navigate away, free storage,
      // and return to retry without losing their result.
      const pending: ScanSession = {
        ...finalized,
        pendingSave: true,
        pendingSaveFailure: getLastSaveFailure() ?? undefined,
      };
      saveActiveSession(pending);
      sessionRef.current = pending;
      setSession(pending);
      await waitForLastSaveFailureReport();
      return false;
    }

    // Update React state on success
    sessionRef.current = finalized;
    setSession(finalized);

    return true;
  }, [session]);

  const retrySave = useCallback(async (): Promise<boolean> => {
    // Re-attempt saving an already-finalized session (e.g., after user freed storage)
    const current = sessionRef.current ?? session;
    if (!current || !current.finalized) return false;

    // Strip the pendingSave marker before saving
    const toSave: ScanSession = {
      ...current,
      pendingSave: undefined,
      pendingSaveFailure: undefined,
    };
    const saved = await saveFinalizedSession(toSave);

    if (saved) {
      clearActiveSession(); // Session is now properly saved — remove from active
      sessionRef.current = toSave;
      setSession(toSave);
    } else {
      const pending: ScanSession = {
        ...toSave,
        pendingSave: true,
        pendingSaveFailure: getLastSaveFailure() ?? current.pendingSaveFailure,
      };
      saveActiveSession(pending);
      sessionRef.current = pending;
      setSession(pending);
      await waitForLastSaveFailureReport();
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
    retakeForQuality,
    advanceStep,
    goToStep,
    currentStep,
    stepIndex,
    runHeuristicAnalysis,
    finalizeSession,
    retrySave,
  };
}
