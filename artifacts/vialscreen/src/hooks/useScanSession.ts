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
  finalizeSession(): void;
}

export function useScanSession(): UseScanSession {
  const [session, setSession] = useState<ScanSession | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState('');
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
      const result: AnalysisResult = await runAnalysis(
        current.captures,
        current.metadata.peptideName || undefined,
        (phase) => setAnalysisStatus(phase),
      );

      setSession((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          analysisResult: result,
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

  const finalizeSession = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const finalized = {
        ...prev,
        finalized: true,
        updatedAt: new Date().toISOString(),
      };
      // Persist to session store and history
      saveSession(finalized);
      addToHistory(finalized);
      clearActiveSession();
      return finalized;
    });
  }, []);

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
  };
}
