import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { ScanSessionProvider, useScanSessionContext } from '@/context/ScanSessionContext';
import { SCAN_COPY, RESULT_COPY, APPEARANCE_PROFILE_COPY } from '@/constants/copy';
import { APPEARANCE_PROFILES, type AppearanceProfile, type CaptureBackground, type ScanMode } from '@/types';
import StepProgress from '@/components/StepProgress';
import CaptureButton from '@/components/CaptureButton';
import MediaPreview from '@/components/MediaPreview';
import ChecklistItem from '@/components/ChecklistItem';
import TriageBadge from '@/components/TriageBadge';
import CategoryScoreCard from '@/components/CategoryScoreCard';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import { ArrowLeft, ArrowRight, Camera, AlertTriangle, HardDrive, Palette, CheckCircle2, Share2, ImageIcon, FileText, X as XIcon, Lock, Zap, Layers, History, Moon, Save, Loader2, Clock, ClipboardCopy, RefreshCw, ChevronDown, ChevronUp, Send, XCircle, Star } from 'lucide-react';
import { shareOrDownloadCard } from '@/utils/shareCard';
import { shareOrDownloadPdf } from '@/utils/sharePdf';
import { maybeRequestReview } from '@/utils/inAppReview';
import { ScanStep } from '@/types';
import { loadActiveSession, loadSession, getHistoryForSampleName } from '@/utils/storage';
import { useProStatus } from '@/hooks/useProStatus';
import { PRO_PRICE_DISPLAY, rememberUpgradeReturnPath } from '@/utils/pro';
import { hapticSuccess, hapticWarning } from '@/utils/haptics';
import { captureError } from '@/lib/sentry';
import { logAFEvent } from '@/utils/appsflyer';

/** Format a stored ISO date as a compact relative label ("3d ago", "2w ago"). */
function fmtDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** Triage result colour classes for mini badges. */
function triageColor(t: string) {
  if (t === 'pass') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
  if (t === 'do-not-use') return 'bg-red-500/15 text-red-700 dark:text-red-400';
  return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
}
function triageLabel(t: string) {
  if (t === 'pass') return 'Pass';
  if (t === 'do-not-use') return 'DNU';
  return 'Review';
}

// Inline capture quality tips shown on white/black capture steps
const CAPTURE_TIPS = [
  'Center the vial — fill most of the frame',
  'Use even, diffused light — avoid direct flash',
  'Hold steady — full vial body must be visible',
  'Avoid reflections on the vial face',
];

// Appearance profile options in display order — named peptides first, specialty next, fallbacks last
const PROFILE_OPTIONS: AppearanceProfile[] = [
  'bpc157', 'tb500', 'ipamorelin', 'sermorelin', 'melanotan',
  'igf1', 'aod9604', 'epithalon', 'hcg',
  'glp1-clear', 'ghk-cu',
  'clear-standard', 'unknown-custom',
];
/** Profiles gated behind Pro — specialty compounds with non-standard expected appearances */
const PRO_ONLY_PROFILES: AppearanceProfile[] = ['ghk-cu', 'glp1-clear'];

export default function ScanScreen() {
  return (
    <ScanSessionProvider>
      <ScanScreenInner />
    </ScanSessionProvider>
  );
}

function ScanScreenInner() {
  const [, setLocation] = useLocation();
  const [saveFailed, setSaveFailed] = useState(false);

  const {
    session,
    isAnalyzing,
    analysisError,
    startNewSession,
    resumeSession,
    updateMetadata,
    addCapture,
    getCaptureForBackground,
    advanceStep,
    goToStep,
    currentStep,
    runHeuristicAnalysis,
    finalizeSession,
    retrySave,
    abandonSession,
  } = useScanSessionContext();

  // On mount: resume active session from storage or start fresh
  // Handles three cases:
  // 1. Finalized + pendingSave: resume directly to results with save-failure state
  // 2. In-progress (not finalized): resume normally
  // 3. No active session: start new session
  useEffect(() => {
    if (!session) {
      const activeSession = loadActiveSession();
      if (activeSession && activeSession.finalized && activeSession.pendingSave) {
        // Finalized but not saved — resume to results so user can retry
        resumeSession(activeSession);
        setSaveFailed(true);
      } else if (activeSession && !activeSession.finalized) {
        resumeSession(activeSession);
      } else {
        startNewSession();
      }
    }
  }, [session, startNewSession, resumeSession]);

  // Auto-advance from analysis step to results once analysis completes
  useEffect(() => {
    if (currentStep === 'analysis' && !isAnalyzing && session?.analysisResult && !analysisError) {
      advanceStep();
    }
  }, [currentStep, isAnalyzing, session?.analysisResult, analysisError, advanceStep]);

  // Auto-skip black-capture in powder mode — only white background capture is needed
  useEffect(() => {
    if (currentStep === 'black-capture' && session?.metadata.scanMode === 'powder') {
      advanceStep();
    }
  }, [currentStep, session?.metadata.scanMode, advanceStep]);

  if (!session || !currentStep) return <div className="min-h-[100dvh] bg-background" />;

  const handleRetake = () => {
    abandonSession();
    setLocation('/scan');
  };

  const handleFinish = () => {
    const saved = finalizeSession();
    if (saved) {
      setSaveFailed(false);
      setLocation('/history');
    } else {
      setSaveFailed(true);
    }
  };

  const handleRetrySave = () => {
    const saved = retrySave();
    if (saved) {
      setSaveFailed(false);
      setLocation('/history');
    }
    // If still fails, banner stays visible
  };

  const isResults = currentStep === 'results';

  return (
    <div className="h-[100dvh] bg-background max-w-md mx-auto flex flex-col">
      {!isResults && (
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pt-safe">
          <div className="flex items-center px-4 py-3 border-b">
            <button
              onClick={() => setLocation('/home')}
              className="p-2 -ml-2 rounded-full hover:bg-muted active:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold ml-2">Screening Session</h1>
          </div>
          <StepProgress currentStep={currentStep} />
        </header>
      )}

      <main className={`flex-1 flex flex-col ${isResults ? 'overflow-hidden' : 'p-6'}`}>
        {currentStep === 'prepare' && <PrepareStep />}
        {(currentStep === 'white-capture' || currentStep === 'black-capture') && <DualCaptureStep />}
        {currentStep === 'label-capture' && <LabelCaptureStep />}
        {currentStep === 'review' && <ReviewStep />}
        {currentStep === 'analysis' && <AnalysisStep />}
        {currentStep === 'results' && (
          <ResultsStep
            onFinish={handleFinish}
            onRetake={handleRetake}
            saveFailed={saveFailed}
            onRetrySave={handleRetrySave}
            onClearSaveFailure={() => setSaveFailed(false)}
          />
        )}
      </main>
    </div>
  );
}

// ─── Step Components ───────────────────────────────────────────

function PrepareStep() {
  const { session, updateMetadata, advanceStep } = useScanSessionContext();
  const { isPro } = useProStatus();

  // Baseline comparison: count previous scans of the same sample name (Pro only)
  const baselinePrevCount = useMemo(() => {
    if (!isPro || !session?.metadata.peptideName?.trim()) return 0;
    return getHistoryForSampleName(session.metadata.peptideName).length;
  }, [isPro, session?.metadata.peptideName]);
  const [, navigate] = useLocation();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const scanMode: ScanMode = (session?.metadata.scanMode ?? 'reconstituted') as ScanMode;
  const isPowder = scanMode === 'powder';

  const activeChecklist = isPowder
    ? SCAN_COPY.prepare.powderChecklist
    : SCAN_COPY.prepare.checklist;

  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    new Array(activeChecklist.length).fill(true),
  );

  // Reset checklist (pre-ticked) when scan mode changes
  const prevScanModeRef = useRef<ScanMode>(scanMode);
  useEffect(() => {
    if (prevScanModeRef.current !== scanMode) {
      prevScanModeRef.current = scanMode;
      setCheckedItems(new Array(activeChecklist.length).fill(true));
    }
  }, [scanMode, activeChecklist.length]);

  const allChecked = checkedItems.every(Boolean);
  const selectedProfile = session?.metadata.appearanceProfile ?? null;

  // Powder mode: no appearance profile required (analysis is profile-agnostic)
  const canProceed = isPowder ? allChecked : (allChecked && selectedProfile !== null);

  const handleCheck = (index: number, val: boolean) => {
    const newItems = [...checkedItems];
    newItems[index] = val;
    setCheckedItems(newItems);
  };

  const handleProfileSelect = (profile: AppearanceProfile) => {
    updateMetadata({ appearanceProfile: profile });
  };

  const handleScanModeSelect = (mode: ScanMode) => {
    if (mode === 'powder' && !isPro) {
      setShowUpgradePrompt(true);
      return;
    }
    setShowUpgradePrompt(false);
    updateMetadata({ scanMode: mode });
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{SCAN_COPY.prepare.title}</h2>
        <p className="text-muted-foreground text-sm">{SCAN_COPY.prepare.instruction}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 -mx-1 px-1">

        {/* ── Scan Type Selection ── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Scan Type
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3 pl-6">
            Select the state of the vial you are screening.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleScanModeSelect('reconstituted')}
              className={`text-left rounded-xl border p-3 transition-colors ${
                scanMode === 'reconstituted'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card hover:bg-muted/50'
              }`}
            >
              <p className="text-xl mb-1.5">🧪</p>
              <p className="font-semibold text-sm leading-snug">Liquid</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                After adding BAC water
              </p>
            </button>

            <button
              onClick={() => handleScanModeSelect('powder')}
              className={`text-left rounded-xl border p-3 transition-colors relative ${
                scanMode === 'powder'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card hover:bg-muted/50'
              }`}
            >
              {!isPro && (
                <div className="absolute top-2 right-2 bg-primary/10 rounded-full p-0.5">
                  <Lock className="w-3 h-3 text-primary" />
                </div>
              )}
              <p className="text-xl mb-1.5">🔬</p>
              <p className="font-semibold text-sm leading-snug">Pre-Mix Powder</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Lyophilized, before mixing
                {!isPro && <span className="text-primary font-medium"> · Pro</span>}
              </p>
            </button>
          </div>

          {showUpgradePrompt && !isPro && (
            <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
              <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary">Pro Feature</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Pre-mix powder scanning is part of PepScan Pro — {PRO_PRICE_DISPLAY}.
                </p>
                <button
                  onClick={() => { rememberUpgradeReturnPath('/scan'); navigate('/upgrade'); }}
                  className="mt-2 text-xs font-bold text-primary hover:underline"
                >
                  Unlock Pro →
                </button>
              </div>
              <button onClick={() => setShowUpgradePrompt(false)} className="text-muted-foreground">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ── Appearance Profile Selection (liquid mode only) ── */}
        {!isPowder && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Palette className="w-4 h-4 text-muted-foreground shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {SCAN_COPY.prepare.profileHeading}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3 pl-6">
              {SCAN_COPY.prepare.profileSubheading}
            </p>
            <div className="space-y-2">
              {PROFILE_OPTIONS.map((profile) => {
                const info = APPEARANCE_PROFILES[profile];
                const copy = APPEARANCE_PROFILE_COPY[profile];
                const isSelected = selectedProfile === profile;
                const isLocked = !isPro && PRO_ONLY_PROFILES.includes(profile);
                return (
                  <button
                    key={profile}
                    onClick={() => {
                      if (isLocked) { rememberUpgradeReturnPath('/scan'); navigate('/upgrade'); return; }
                      handleProfileSelect(profile);
                    }}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : isLocked
                          ? 'border-border bg-card opacity-60'
                          : 'border-border bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                        isSelected ? 'border-primary' : 'border-muted-foreground/40'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm leading-snug">{info.label}</p>
                          {isLocked && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary rounded-full px-1.5 py-0.5">Pro</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {copy.description}
                        </p>
                        {isSelected && profile === 'ghk-cu' && (
                          <p className="text-xs text-primary/80 mt-1.5 font-medium">
                            Blue coloration will not be treated as a concern.
                          </p>
                        )}
                        {isSelected && profile === 'glp1-clear' && (
                          <p className="text-xs text-primary/80 mt-1.5 font-medium">
                            Slight yellow or warm tint will not be penalized.
                          </p>
                        )}
                        {isSelected && profile === 'unknown-custom' && (
                          <p className="text-xs text-warning mt-1.5 font-medium">
                            Conservative mode — uncertain findings default to Review.
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Preparation Checklist ── */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            {SCAN_COPY.prepare.checklistHeading}
          </h3>
          <div className="space-y-3">
            {activeChecklist.map((item, i) => (
              <ChecklistItem
                key={`${scanMode}-${i}`}
                label={item}
                checked={checkedItems[i]}
                onCheckedChange={(c) => handleCheck(i, c)}
              />
            ))}
          </div>
        </div>

        {/* ── Optional Metadata ── */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Optional Details
          </h3>
          <div className="space-y-3">
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">
                Sample name
                {isPro && <span className="ml-1 text-primary font-semibold">· Baseline Comparison</span>}
              </span>
              <input
                type="text"
                placeholder="e.g. BPC-157"
                className="w-full bg-card border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={session?.metadata.peptideName || ''}
                onChange={(e) => updateMetadata({ peptideName: e.target.value })}
              />
              {isPro && baselinePrevCount > 0 && (
                <p className="mt-1.5 text-xs text-primary flex items-center gap-1.5">
                  <History className="w-3 h-3 shrink-0" />
                  {baselinePrevCount} previous scan{baselinePrevCount !== 1 ? 's' : ''} of this sample found — AI will compare against your baseline
                </p>
              )}
              {isPro && !session?.metadata.peptideName?.trim() && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Enter a name to enable baseline comparison across scans (Pro).
                </p>
              )}
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Vendor / source</span>
              <input
                type="text"
                placeholder="Where it came from"
                className="w-full bg-card border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={session?.metadata.vendor || ''}
                onChange={(e) => updateMetadata({ vendor: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-medium text-muted-foreground mb-1.5">Batch / lot #</span>
                <input
                  type="text"
                  placeholder="e.g. B240701"
                  className="w-full bg-card border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={session?.metadata.batchLot || ''}
                  onChange={(e) => updateMetadata({ batchLot: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-muted-foreground mb-1.5">Concentration</span>
                <input
                  type="text"
                  placeholder="e.g. 5 mg"
                  className="w-full bg-card border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={session?.metadata.concentration || ''}
                  onChange={(e) => updateMetadata({ concentration: e.target.value })}
                />
              </label>
            </div>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Purchase date</span>
              <input
                type="text"
                placeholder="e.g. 12/07/2026"
                className="w-full bg-card border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                value={session?.metadata.purchaseDate || ''}
                onChange={(e) => updateMetadata({ purchaseDate: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</span>
              <textarea
                placeholder="Anything worth remembering about this vial"
                rows={2}
                className="w-full bg-card border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                value={session?.metadata.notes || ''}
                onChange={(e) => updateMetadata({ notes: e.target.value })}
              />
            </label>

            {/* Reconstitution time — liquid mode only */}
            {!isPowder && (
              <div>
                <span className="block text-xs font-medium text-muted-foreground mb-1.5">
                  When was it reconstituted?
                  <span className="ml-1 font-normal opacity-70">(helps AI interpret appearance)</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['just-now',  'Just now',     '< 1 hour'],
                    ['1-8h',      '1–8 hours',    'same day'],
                    ['1-2d',      '1–2 days',     'refrigerated'],
                    ['2d-plus',   '2+ days',      'older stock'],
                  ] as const).map(([val, label, sub]) => {
                    const sel = session?.metadata.reconstitutedAt === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => updateMetadata({ reconstitutedAt: sel ? null : val })}
                        className={`text-left rounded-xl border p-3 transition-colors ${
                          sel
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border bg-card hover:bg-muted/50'
                        }`}
                      >
                        <p className="font-semibold text-xs leading-snug">{label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gate button on profile selection (liquid) and checklist (both modes) */}
      <div className="space-y-2 pt-2 pb-safe-4">
        {!isPowder && !selectedProfile && (
          <p className="text-xs text-muted-foreground text-center">
            Select an appearance profile above to continue.
          </p>
        )}
        {(isPowder || selectedProfile) && !allChecked && (
          <p className="text-xs text-muted-foreground text-center">
            Complete the preparation checklist to continue.
          </p>
        )}
        <button
          disabled={!canProceed}
          onClick={advanceStep}
          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-br from-primary to-primary/85 text-primary-foreground py-3.5 px-4 rounded-2xl font-bold shadow-md shadow-primary/20 disabled:opacity-40 transition-all active:scale-[0.98]"
        >
          <Camera className="w-4 h-4" />
          Begin Capture
        </button>
      </div>
    </div>
  );
}

function DualCaptureStep() {
  const { session, addCapture, getCaptureForBackground, advanceStep, goToStep, currentStep } = useScanSessionContext();
  const [transitioning, setTransitioning] = useState(false);
  const prevStepRef = useRef(currentStep);

  const isBlackPhase = currentStep === 'black-capture';
  const isPowderMode = session?.metadata.scanMode === 'powder';
  const activeBackground: CaptureBackground = isBlackPhase ? 'black' : 'white';
  const whiteCap = getCaptureForBackground('white');
  const blackCap = getCaptureForBackground('black');
  const existing = getCaptureForBackground(activeBackground);
  const copy = isBlackPhase
    ? SCAN_COPY.blackCapture
    : (isPowderMode ? SCAN_COPY.powderCapture : SCAN_COPY.whiteCapture);

  // Trigger slide-in animation when background phase changes
  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      prevStepRef.current = currentStep;
      setTransitioning(false); // fade in the new content
    }
  }, [currentStep]);

  // Auto-advance after white capture → black phase (or skip to label-capture in powder mode)
  useEffect(() => {
    if (!isBlackPhase && existing) {
      const timer = setTimeout(() => {
        if (isPowderMode) {
          // Powder only needs white background — skip straight to label capture
          goToStep('label-capture');
        } else {
          handleSwitchToBlack();
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [existing?.dataUrl, isBlackPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance after black capture → label step
  useEffect(() => {
    if (isBlackPhase && existing) {
      const timer = setTimeout(() => advanceStep(), 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [existing?.dataUrl, isBlackPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSwitchToBlack = () => {
    setTransitioning(true); // fade out current content
    setTimeout(() => {
      advanceStep(); // white-capture → black-capture
      // Give React two frames to commit the new currentStep before fading in
      requestAnimationFrame(() => requestAnimationFrame(() => setTransitioning(false)));
    }, 180);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* ── Dual progress pills ── */}
      <div className="flex gap-2.5">
        {(['white', 'black'] as const).filter(bg => !isPowderMode || bg === 'white').map((bg, i) => {
          const cap = bg === 'white' ? whiteCap : blackCap;
          const isActive = bg === activeBackground;
          const isDone = !!cap;
          return (
            <div
              key={bg}
              className={`flex items-center gap-2 flex-1 rounded-xl px-3 py-2.5 border transition-all duration-300 ${
                isDone
                  ? 'border-green-500/40 bg-green-500/5'
                  : isActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card opacity-40'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                isDone
                  ? 'bg-green-500 text-white'
                  : isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {isDone ? '✓' : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold leading-none ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {bg === 'white' ? 'White' : 'Black'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                  {isDone ? 'Captured ✓' : isActive ? 'In progress' : 'Next'}
                </p>
              </div>
              {isDone && cap && (
                <img
                  src={cap.dataUrl}
                  alt={`${bg} capture thumbnail`}
                  className="w-8 h-10 object-cover rounded-md shrink-0"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Active step content (fades/slides on transition) ── */}
      <div
        className={`flex-1 flex flex-col gap-4 transition-all duration-200 ease-out ${
          transitioning ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'
        }`}
      >
        <div>
          <h2 className="text-xl font-bold mb-1.5">{copy.title}</h2>
          <p className="text-muted-foreground text-sm">{copy.instruction}</p>
        </div>

        {/* Captured preview */}
        {existing && (
          <div className="rounded-xl overflow-hidden border aspect-[16/9]">
            <img src={existing.dataUrl} alt="Captured" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Background-specific tips */}
        <ul className="space-y-1.5">
          {copy.tips.map((tip, i) => (
            <li key={i} className="text-xs text-muted-foreground flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
              {tip}
            </li>
          ))}
        </ul>

        {/* Quality tips */}
        <div className="bg-secondary/40 rounded-xl p-3 border border-secondary">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            For best results
          </p>
          <ul className="space-y-1">
            {CAPTURE_TIPS.map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2 items-start">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/60 mt-1.5 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="space-y-3 pt-4 border-t pb-safe-4">
        {/* Back button: visible on black-capture before a photo is taken */}
        {isBlackPhase && !existing && (
          <button
            onClick={() => goToStep('white-capture')}
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground py-2 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retake white background shot
          </button>
        )}
        <CaptureButton
          onCapture={(res) => addCapture({ background: activeBackground, ...res })}
          captured={!!existing}
          background={activeBackground}
        />
        {existing && (
          <button
            onClick={
              isPowderMode
                ? () => goToStep('label-capture')
                : isBlackPhase
                ? advanceStep
                : handleSwitchToBlack
            }
            className="w-full flex items-center justify-center gap-2.5 bg-foreground text-background py-3.5 px-4 rounded-2xl font-bold shadow-sm active:scale-[0.98] transition-transform"
          >
            {isBlackPhase || isPowderMode
              ? <><ArrowRight className="w-4 h-4" /> {isPowderMode ? 'Continue to Review' : 'Continue'}</>
              : <><Moon className="w-4 h-4" /> Switch to Black Background</>}
          </button>
        )}
      </div>
    </div>
  );
}

function LabelCaptureStep() {
  const { addCapture, getCaptureForBackground, advanceStep } = useScanSessionContext();
  const copy = SCAN_COPY.labelCapture;

  const label1 = getCaptureForBackground('label');
  const label2 = getCaptureForBackground('label2');

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{copy.title}</h2>
        <p className="text-muted-foreground text-sm">{copy.instruction}</p>
      </div>

      <div className="flex-1 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {label1 ? (
              <MediaPreview capture={label1} />
            ) : (
              <div className="bg-secondary aspect-[3/4] rounded-xl flex items-center justify-center text-xs text-muted-foreground font-medium p-4 text-center border">
                Primary Label
              </div>
            )}
            <CaptureButton
              label="Capture Label"
              onCapture={(res) => addCapture({ background: 'label', ...res })}
              captured={!!label1}
              background="label"
            />
          </div>

          <div className="space-y-2">
            {label2 ? (
              <MediaPreview capture={label2} />
            ) : (
              <div className="bg-secondary aspect-[3/4] rounded-xl flex items-center justify-center text-xs text-muted-foreground font-medium p-4 text-center border border-dashed">
                Extra Detail
              </div>
            )}
            <CaptureButton
              label="Add Detail"
              onCapture={(res) => addCapture({ background: 'label2', ...res })}
              captured={!!label2}
              background="label2"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-2">{copy.optional}</p>
      </div>

      <div className="space-y-3 pt-4 border-t pb-safe-4">
        <button
          onClick={advanceStep}
          className="w-full flex items-center justify-center gap-2.5 bg-foreground text-background py-3.5 px-4 rounded-2xl font-bold shadow-sm active:scale-[0.98] transition-transform"
        >
          <ArrowRight className="w-4 h-4" />
          {label1 ? 'Continue to Review' : 'Skip Label Capture'}
        </button>
      </div>
    </div>
  );
}

function ReviewStep() {
  const { session, goToStep, runHeuristicAnalysis, advanceStep } = useScanSessionContext();
  const { isPro } = useProStatus();

  const handleAnalyze = async () => {
    advanceStep(); // Advance to analysis step UI immediately

    // Pro baseline: look up previous scans of the same sample and pass their
    // findings to the AI so it can highlight deviations from the user's baseline.
    let baselineContext: string[] | undefined;
    let baselineScanCount = 0;

    if (isPro && session?.metadata.peptideName?.trim()) {
      const prevItems = getHistoryForSampleName(
        session.metadata.peptideName,
        (session.metadata.scanMode ?? 'reconstituted') as ScanMode,
      ).slice(0, 3);
      if (prevItems.length > 0) {
        baselineScanCount = prevItems.length;
        const prevFindings = prevItems
          .map((h) => loadSession(h.id))
          .filter(Boolean)
          .flatMap((s) => s!.analysisResult?.primaryReasons?.slice(0, 3) ?? []);
        if (prevFindings.length > 0) baselineContext = prevFindings;
      }
    }

    await runHeuristicAnalysis({ includeAiVision: isPro, baselineContext, baselineScanCount });
  };

  const captures = session?.captures ?? [];
  const profile = session?.metadata.appearanceProfile ?? null;

  // Guard: user reached review without any captures
  if (captures.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center space-y-6 px-6">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">No Captures Found</h2>
          <p className="text-sm text-muted-foreground">
            At least a white and black background capture are needed before analysis can run.
          </p>
        </div>
        <button
          onClick={() => goToStep('white-capture')}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold"
        >
          Go Back to Capture
        </button>
      </div>
    );
  }

  // Warn if only partial captures present (missing white or black)
  const hasWhite = captures.some((c) => c.background === 'white');
  const hasBlack = captures.some((c) => c.background === 'black');
  const missingCaptures = !hasWhite || !hasBlack;

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{SCAN_COPY.review.title}</h2>
        <p className="text-muted-foreground text-sm">{SCAN_COPY.review.instruction}</p>
      </div>

      {/* Profile reminder */}
      {profile && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 border rounded-lg px-3 py-2">
          <Palette className="w-3.5 h-3.5 shrink-0" />
          <span>Profile: <span className="font-semibold text-foreground">{APPEARANCE_PROFILES[profile].label}</span></span>
          {profile === 'ghk-cu' && (
            <span className="ml-auto text-primary/80 font-medium">Blue tint expected</span>
          )}
          {profile === 'glp1-clear' && (
            <span className="ml-auto text-primary/80 font-medium">Slight yellow OK</span>
          )}
          {profile === 'unknown-custom' && (
            <span className="ml-auto text-warning font-medium">Conservative mode</span>
          )}
        </div>
      )}

      {missingCaptures && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 flex gap-3 items-start">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-warning leading-relaxed">
            {!hasWhite && !hasBlack
              ? 'Both white and black background captures are missing. Analysis accuracy will be very limited.'
              : !hasWhite
                ? 'White background capture is missing. Clarity and fill level cannot be assessed.'
                : 'Black background capture is missing. Visible particle screening will be limited.'}
            {' '}You can still run analysis, but the result will have reduced confidence.
          </p>
        </div>
      )}

      <div className="flex-1 grid grid-cols-2 gap-4 auto-rows-max overflow-y-auto pb-4">
        {captures.map((c) => (
          <MediaPreview
            key={c.id}
            capture={c}
            onRetake={() => {
              if (c.background === 'white') goToStep('white-capture');
              if (c.background === 'black') goToStep('black-capture');
              if (c.background.startsWith('label')) goToStep('label-capture');
            }}
          />
        ))}
      </div>

      <div className="pt-4 border-t space-y-3 pb-safe-4">
        <button
          onClick={handleAnalyze}
          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-br from-primary to-primary/85 text-primary-foreground py-3.5 px-4 rounded-2xl font-bold shadow-md shadow-primary/20 active:scale-[0.98] transition-transform"
        >
          <Zap className="w-4 h-4" />
          Run Analysis
        </button>
        <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-wider">
          AI Vision + Heuristic Engine
        </p>
      </div>
    </div>
  );
}

function AnalysisStep() {
  const { session, analysisError, analysisStatus, isAnalyzing, runHeuristicAnalysis } = useScanSessionContext();
  const { isPro } = useProStatus();

  // Safety-net: if this step renders without analysis running (e.g., session was
  // resumed with currentStep stuck at 'analysis'), auto-trigger once on mount.
  useEffect(() => {
    if (!isAnalyzing && !session?.analysisResult && !analysisError) {
      runHeuristicAnalysis({ includeAiVision: isPro });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally mount-only — safety net for stale resumed sessions

  const isOcrPhase =
    analysisStatus.toLowerCase().includes('ocr') ||
    analysisStatus.toLowerCase().includes('label') ||
    analysisStatus.toLowerCase().includes('downloading') ||
    analysisStatus.toLowerCase().includes('initializing');

  const isAiPhase = analysisStatus.toLowerCase().includes('ai vision');

  return (
    <div className="flex flex-col h-full items-center justify-center text-center space-y-8 px-6">
      {analysisError ? (
        <>
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">Analysis Failed</h2>
            <p className="text-sm text-muted-foreground">{analysisError}</p>
          </div>
          <button
            onClick={() => runHeuristicAnalysis({ includeAiVision: isPro })}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold"
          >
            Retry Analysis
          </button>
        </>
      ) : (
        <>
          <div className="relative w-24 h-24 shrink-0">
            <div className="absolute inset-0 w-24 h-24 border-4 border-muted rounded-full" />
            <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-3">{SCAN_COPY.analysis.title}</h2>
            <p className="text-sm text-muted-foreground min-h-[40px] leading-relaxed transition-opacity">
              {analysisStatus || SCAN_COPY.analysis.instruction}
            </p>
            {isOcrPhase && (
              <p className="mt-3 text-xs text-muted-foreground/70 italic">
                First-run label recognition may take 10–30 s while the engine loads.
              </p>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            {SCAN_COPY.analysis.note}
          </p>
        </>
      )}
    </div>
  );
}

// ── Next-steps checklists by triage outcome ─────────────────────────────────

const NEXT_STEPS: Record<'review' | 'do-not-use', Array<{ icon: 'check' | 'x'; text: string }>> = {
  review: [
    { icon: 'check', text: 'Inspect the vial at arm\'s length against a plain white background in good light' },
    { icon: 'check', text: 'Compare side-by-side with a known-good vial of the same compound if available' },
    { icon: 'check', text: 'Retake the scan with better lighting if capture quality was flagged' },
    { icon: 'check', text: 'Contact your supplier and share this report if the concern persists' },
  ],
  'do-not-use': [
    { icon: 'x',     text: 'Set this vial aside — do not use until the findings are resolved' },
    { icon: 'check', text: 'Save and share this scan report with your supplier as evidence' },
    { icon: 'check', text: 'Request batch documentation (COA) from your supplier for this lot' },
    { icon: 'check', text: 'Consider requesting a replacement or refund from your supplier' },
  ],
};

// Compound-specific tips shown for review/DNU results when a peptide name is recognised
const COMPOUND_TIPS: Array<{ match: RegExp; tip: string }> = [
  { match: /bpc.?157/i,       tip: 'BPC-157 can appear slightly turbid after multiple freeze-thaw cycles. Check your storage and reconstitution history.' },
  { match: /tb.?500|thymosin/i, tip: 'TB-500 should be completely clear in solution. Any cloudiness or particles are a concern worth investigating.' },
  { match: /ipamorelin/i,      tip: 'Ipamorelin in solution should be colourless and clear. Yellowing typically indicates oxidation.' },
  { match: /sermorelin/i,      tip: 'Sermorelin degrades faster than most peptides. Unexpected colour or turbidity may indicate degradation.' },
  { match: /melanotan|mt.?2/i, tip: 'Melanotan II can develop a slight amber tint over time — compare with your expected appearance baseline.' },
  { match: /ghk.?cu/i,         tip: 'GHK-Cu naturally has a blue tint — this is expected. Turbidity or particles are the concern here, not the blue colour.' },
  { match: /glp.?1|semaglutide|tirzepatide/i, tip: 'GLP-1 analogues should be clear and colourless. Any cloudiness or visible particles warrants immediate investigation.' },
  { match: /igf.?1/i,          tip: 'IGF-1 is sensitive to temperature. Turbidity after reconstitution may indicate thermal degradation.' },
  { match: /hcg/i,             tip: 'hCG in solution degrades quickly. Check reconstitution date and storage temperature if turbidity appears.' },
];

function getCompoundTip(peptideName: string | null | undefined): string | null {
  if (!peptideName?.trim()) return null;
  for (const { match, tip } of COMPOUND_TIPS) {
    if (match.test(peptideName)) return tip;
  }
  return null;
}

// ── Finding context lookup ──────────────────────────────────────────────────

const FINDING_CONTEXT_MAP: Array<{ test: RegExp; context: string }> = [
  {
    test: /visible.*particle|particle.*detected|detected.*particle/i,
    context: 'Particles in a normally clear solution can indicate contamination, precipitation, or chemical degradation — always investigate before any use.',
  },
  {
    test: /no.*(?:significant.*)?particle/i,
    context: 'No visible particles is a positive sign, though submicron particles (< 0.1 mm) are too small to detect visually.',
  },
  {
    test: /turbid|turbidity|haze|hazy|cloudy|cloudiness/i,
    context: 'Cloudiness in a normally clear peptide may indicate bacterial contamination, degradation, or chemical precipitation.',
  },
  {
    test: /unexpected.*colou?r|colou?r.*detected|discolou?r/i,
    context: 'Unexpected colour change can signal oxidation, contamination, or chemical breakdown of the compound.',
  },
  {
    test: /fill level|underfill|overfill/i,
    context: 'Unusual fill level may indicate evaporation, vial damage, or an error during compounding.',
  },
  {
    test: /differential.*(?:within|normal|range)|(?:within|normal|range).*differential/i,
    context: 'The light-scatter difference between backgrounds was as expected — supporting a clear solution assessment.',
  },
  {
    test: /quality.*degrad|image.*quality|blur|exposure/i,
    context: 'Poor capture quality limits analysis accuracy. Retaking with better lighting and a steady hold will improve confidence.',
  },
];

function getFindingContext(finding: string): string | null {
  for (const { test, context } of FINDING_CONTEXT_MAP) {
    if (test.test(finding)) return context;
  }
  return null;
}

// ── Results Step ────────────────────────────────────────────────────────────

interface ResultsStepProps {
  onFinish: () => void;
  onRetake: () => void;
  saveFailed: boolean;
  onRetrySave: () => void;
  onClearSaveFailure: () => void;
}

function ResultsStep({ onFinish, onRetake, saveFailed, onRetrySave, onClearSaveFailure }: ResultsStepProps) {
  const { session } = useScanSessionContext();
  const [, setLocation] = useLocation();
  const { isPro } = useProStatus();
  const [copied, setCopied] = useState(false);
  const [supplierCopied, setSupplierCopied] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [nextStepsOpen, setNextStepsOpen] = useState(true);
  const result = session?.analysisResult;

  // Haptic verdict feedback + in-app review trigger for PASS results
  // Also fires the AppsFlyer scan_complete event so X Ads can optimise toward real users.
  useEffect(() => {
    if (!result) return;
    if (result.triageResult === 'pass') {
      void hapticSuccess();
      void maybeRequestReview(session?.id);
    } else {
      void hapticWarning();
    }

    const afResult =
      result.triageResult === 'pass'       ? 'PASS' :
      result.triageResult === 'do-not-use' ? 'DNU'  : 'FAIL';
    const compound =
      session?.metadata.peptideName?.trim() ||
      session?.metadata.appearanceProfile  ||
      'unknown';
    void logAFEvent('scan_complete', { result: afResult, compound });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Text share — plain summary for any platform
  const handleShareText = async () => {
    if (!result) return;
    setShowShareSheet(false);
    setShareError(null);
    const name = session?.metadata.peptideName;
    const lines = [
      'PepScan Screening Result',
      '─────────────────────────',
      name ? `Vial: ${name}` : null,
      `Result: ${result.triageResult === 'do-not-use' ? 'DO NOT USE' : result.triageResult.toUpperCase()}`,
      `Confidence: ${result.overallConfidence}%`,
      '',
      'Findings:',
      ...result.primaryReasons.map((r) => `• ${r}`),
      '',
      '⚠️ Visual screening only. Does not confirm safety, identity, purity, or potency.',
    ].filter((l): l is string => l !== null);
    const text = lines.join('\n');
    if ('share' in navigator) {
      try { await navigator.share({ title: 'PepScan Result', text }); return; } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* unavailable */ }
  };

  // Image card — PNG designed for social sharing
  const handleShareImageCard = async () => {
    if (!result) return;
    setShowShareSheet(false);
    setGeneratingCard(true);
    setShareError(null);
    try {
      await shareOrDownloadCard({
        triageResult: result.triageResult,
        overallConfidence: result.overallConfidence,
        peptideName: session?.metadata.peptideName,
        vendor: session?.metadata.vendor,
        primaryReasons: result.primaryReasons,
      });
    } catch (err) {
      captureError(err, { context: 'share-image-card' });
      setShareError('Could not share the image. Try the text summary instead.');
    } finally {
      setGeneratingCard(false);
    }
  };

  // PDF report — includes vial photos
  const handleSharePdf = async () => {
    if (!result) return;
    setShowShareSheet(false);
    setGeneratingPdf(true);
    setShareError(null);
    try {
      await shareOrDownloadPdf({
        triageResult: result.triageResult,
        overallConfidence: result.overallConfidence,
        peptideName: session?.metadata.peptideName,
        vendor: session?.metadata.vendor,
        primaryReasons: result.primaryReasons,
        ocrText: result.ocrText,
        captures: session?.captures,
        scannedAt: session?.createdAt,
      });
    } catch (err) {
      captureError(err, { context: 'share-pdf' });
      setShareError('Could not generate the PDF. Try the text summary instead.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Supplier report — detailed plain-text report for forwarding to a supplier
  const handleSupplierReport = async () => {
    if (!result) return;
    setShareError(null);
    const name = session?.metadata.peptideName;
    const vendor = session?.metadata.vendor;
    const batchLot = session?.metadata.batchLot;
    const scannedAt = session?.createdAt ? new Date(session.createdAt).toLocaleString() : 'Unknown';
    const triageLabel = result.triageResult === 'do-not-use' ? 'DO NOT USE' : result.triageResult.toUpperCase();

    const lines = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'PepScan QC Report',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      name   ? `Compound:   ${name}`   : null,
      vendor ? `Supplier:   ${vendor}` : null,
      batchLot ? `Batch/Lot:  ${batchLot}` : null,
      `Scanned:    ${scannedAt}`,
      `Result:     ${triageLabel}`,
      `Confidence: ${result.overallConfidence}%`,
      '',
      'Findings:',
      ...result.primaryReasons.map((r) => `  • ${r}`),
      '',
      'Category Scores:',
      ...result.categories
        .filter((c) => !['glareInterference'].includes(c.category))
        .map((c) => `  • ${c.label}: ${c.score}/100 (${c.status})`),
      result.ocrText ? `\nLabel Text: ${result.ocrText}` : null,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'Scanned with PepScan — visual QC for peptide research vials.',
      '⚠️  Visual screening only. Does not confirm safety, identity, purity, or potency.',
    ].filter((l): l is string => l !== null);

    const text = lines.join('\n');

    if ('share' in navigator) {
      try {
        await navigator.share({ title: 'PepScan QC Report', text });
        return;
      } catch { /* fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      setSupplierCopied(true);
      setTimeout(() => setSupplierCopied(false), 3000);
    } catch { setShareError('Could not copy the report. Try the Share button instead.'); }
  };

  // Baseline score comparison — loads previous sessions so we can show per-category deltas.
  // Must be declared before the null guard (React hooks must run unconditionally).
  const baselineData = useMemo(() => {
    if (!result?.baselineUsed || !session?.metadata.peptideName) return null;
    const prevItems = getHistoryForSampleName(
      result.baselineUsed.sampleName,
      (session.metadata.scanMode ?? 'reconstituted') as ScanMode,
    ).slice(0, 3);
    if (prevItems.length === 0) return null;

    // Load full sessions to get per-category scores (synchronous localStorage reads)
    const prevSessions = prevItems
      .map((h) => ({ item: h, full: loadSession(h.id) }))
      .filter((x) => !!x.full?.analysisResult?.categories?.length);

    // Average each category's score across previous sessions
    const categoryAvgs: Record<string, number> = {};
    if (prevSessions.length > 0) {
      const keys = new Set(prevSessions.flatMap((x) => x.full!.analysisResult!.categories.map((c) => c.category)));
      for (const key of keys) {
        const scores = prevSessions.flatMap((x) =>
          x.full!.analysisResult!.categories.filter((c) => c.category === key).map((c) => c.score),
        );
        if (scores.length) categoryAvgs[key] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }
    }

    const avgConfidence = Math.round(prevItems.reduce((a, b) => a + b.overallConfidence, 0) / prevItems.length);
    return { items: prevItems, categoryAvgs, avgConfidence };
  }, [result?.baselineUsed, session?.metadata.peptideName, session?.metadata.scanMode]);

  // Null guard
  if (!result) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center space-y-6 px-6">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Result Not Available</h2>
          <p className="text-sm text-muted-foreground">The analysis result could not be loaded. You can retake the scan or return home.</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={onRetake} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold">Start New Scan</button>
          <button onClick={() => setLocation('/home')} className="w-full bg-secondary text-secondary-foreground py-3 rounded-xl font-semibold text-sm">Back to Home</button>
        </div>
      </div>
    );
  }

  const resultCopy = RESULT_COPY[result.triageResult];
  const profileUsed = result.profileUsed ?? session?.metadata.appearanceProfile ?? null;
  const profileInfo = profileUsed ? APPEARANCE_PROFILES[profileUsed] : null;

  return (
    <div className="flex flex-col h-full">
      {/* Save failure banner */}
      {saveFailed && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-3 shrink-0">
          <div className="flex items-start gap-3">
            <HardDrive className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-destructive mb-0.5">Scan could not be saved</p>
              <p className="text-xs text-destructive/80 leading-relaxed">Device storage may be full. Free space by deleting older scans, then try again.</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => { onClearSaveFailure(); setLocation('/history'); }} className="flex-1 bg-destructive/15 text-destructive text-xs font-bold py-2 px-3 rounded-lg">Free Space →</button>
            <button onClick={onRetrySave} className="flex-1 bg-destructive text-destructive-foreground text-xs font-bold py-2 px-3 rounded-lg">Try Again</button>
          </div>
        </div>
      )}

      {/* Scrollable result content */}
      <div className="flex-1 overflow-y-auto">
        {/* Result header */}
        <div className="bg-card border-b px-6 py-10 text-center">
          <TriageBadge result={result.triageResult} size="lg" className="mb-5" />
          <h1 className="text-2xl font-bold tracking-tight mb-3">{resultCopy.summary}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-xs mx-auto">
            {resultCopy.explanation}
          </p>

          {/* Prominent statutory warning — shown on every result */}
          <div className="mt-2 mb-4 bg-destructive/8 border border-destructive/30 rounded-xl p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-destructive mb-1.5">⚠ Important Limitation</p>
            <p className="text-xs text-destructive/90 leading-relaxed">{resultCopy.caveat}</p>
          </div>

          {/* Recommended action */}
          <div className="bg-secondary/70 rounded-xl p-4 text-sm text-foreground text-left border">
            <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Recommended Action</p>
            <p className="leading-relaxed">{resultCopy.action}</p>
          </div>

          {/* Low confidence */}
          {result.overallConfidence < 50 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              Low Confidence ({result.overallConfidence}%) — results less reliable
            </div>
          )}

          {/* AI Enhanced badge */}
          {result.aiEnhanced && (
            <div className="mt-4 inline-flex items-center gap-1.5 bg-primary/10 border border-primary/25 text-primary px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              AI Vision Enhanced
            </div>
          )}

          {/* Baseline comparison badge — compact; detail appears in the body section */}
          {result.baselineUsed && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <History className="w-3 h-3 shrink-0" />
              Baseline — {result.baselineUsed.previousScanCount} previous scan{result.baselineUsed.previousScanCount !== 1 ? 's' : ''}
            </div>
          )}

          {/* Profile used */}
          {profileInfo && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span>Screened using: <span className="font-semibold text-foreground">{profileInfo.label}</span></span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-8">
          {/* ── What We Found ── */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">What We Found</h2>
            <ul className="space-y-3">
              {result.primaryReasons.map((reason, i) => {
                const context = getFindingContext(reason);
                const isFlag =
                  /particle.*detected|detected.*particle|haze|turbid|cloudy|unexpected.*colou?r/i.test(reason) &&
                  !/no.*particle|within.*range|normal.*range/i.test(reason);
                return (
                  <li key={i} className={`rounded-xl border p-4 ${isFlag ? 'border-destructive/25 bg-destructive/5' : 'border-border bg-secondary/50'}`}>
                    <div className="flex gap-3 items-start">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isFlag ? 'bg-destructive' : 'bg-foreground/60'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed font-medium">{reason}</p>
                        {context && (
                          <p className="text-xs text-muted-foreground leading-relaxed mt-2 italic border-t border-border/50 pt-2">
                            {context}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ── Rescan nudge — poor capture quality ── */}
          {(() => {
            const cq = result.categories.find(c => c.category === 'captureQuality');
            if (!cq || cq.score >= 50) return null;
            return (
              <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-start gap-3">
                  <RefreshCw className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-1">Capture quality affected this result</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">Poor lighting or camera shake can skew scores. A rescan with diffused, even light and a steady hold will give a more reliable result.</p>
                  </div>
                </div>
                <button
                  onClick={onRetake}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-sm font-bold py-2.5 rounded-xl transition-colors active:scale-[0.98]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Rescan with Better Lighting
                </button>
              </section>
            );
          })()}

          {/* ── What to do next (review / DNU only) ── */}
          {(result.triageResult === 'review' || result.triageResult === 'do-not-use') && (
            <section>
              <button
                onClick={() => setNextStepsOpen(o => !o)}
                className="w-full flex items-center justify-between mb-3 text-left"
              >
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">What to Do Next</h2>
                {nextStepsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {nextStepsOpen && (
                <ul className="space-y-2.5">
                  {NEXT_STEPS[result.triageResult].map((step, i) => (
                    <li key={i} className={`flex items-start gap-3 rounded-xl border p-3.5 ${step.icon === 'x' ? 'border-destructive/20 bg-destructive/5' : 'border-border bg-secondary/50'}`}>
                      {step.icon === 'check'
                        ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      }
                      <p className="text-sm text-foreground leading-relaxed">{step.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* ── Compound-specific tip ── */}
          {(result.triageResult === 'review' || result.triageResult === 'do-not-use') && (() => {
            const tip = getCompoundTip(session?.metadata.peptideName);
            if (!tip) return null;
            return (
              <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">{session?.metadata.peptideName} — Compound Note</p>
                    <p className="text-sm text-foreground leading-relaxed">{tip}</p>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* ── AI Vision teaser — all free users ── */}
          {!isPro && !result.aiEnhanced && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                AI Vision Analysis
              </h2>
              <div className="relative rounded-2xl overflow-hidden border border-primary/20">
                {/* Blurred skeleton preview of what an AI analysis looks like */}
                <div
                  className="select-none pointer-events-none p-4 space-y-3 bg-card"
                  style={{ filter: 'blur(4px)', opacity: 0.45 }}
                  aria-hidden
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-lg shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 bg-muted rounded-full w-3/4" />
                      <div className="h-2.5 bg-muted/60 rounded-full w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2.5 bg-muted rounded-full w-full" />
                    <div className="h-2.5 bg-muted rounded-full w-5/6" />
                    <div className="h-2.5 bg-muted/60 rounded-full w-2/3" />
                    <div className="h-2.5 bg-muted/40 rounded-full w-4/5" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-primary/20 rounded-lg flex-1" />
                    <div className="h-8 bg-muted rounded-lg flex-1" />
                  </div>
                </div>

                {/* Lock overlay */}
                <div className="absolute inset-0 bg-background/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-5 text-center">
                  <div className="w-11 h-11 bg-primary/15 border border-primary/25 rounded-2xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight">
                      {result.triageResult === 'pass'
                        ? 'See the full AI Vision breakdown'
                        : 'Find out exactly why this vial flagged'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-[220px] mx-auto">
                      {result.triageResult === 'pass'
                        ? 'Pro unlocks a written explanation of every visual factor assessed — not just the verdict.'
                        : 'Pro gives you a written AI analysis of which specific anomaly triggered this result and how significant it is.'}
                    </p>
                  </div>
                  <button
                    onClick={() => { rememberUpgradeReturnPath('/scan'); setLocation('/upgrade'); }}
                    className="bg-primary text-primary-foreground text-xs font-bold px-5 py-2.5 rounded-xl active:scale-[0.98] transition-all shadow-md shadow-primary/25"
                  >
                    Unlock Pro — {PRO_PRICE_DISPLAY}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ── Baseline Vial Comparison ── */}
          {result.baselineUsed && baselineData && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">How This Vial Compares</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Score changes vs your previous {baselineData.items.length} scan{baselineData.items.length !== 1 ? 's' : ''} of "{result.baselineUsed.sampleName}".
              </p>

              {/* Thumbnail strip — previous scans → this scan (oldest left, current right) */}
              {baselineData.items.some((i) => i.thumbnailDataUrl) && (
                <div className="flex items-end gap-3 mb-5 overflow-x-auto pb-1">
                  {baselineData.items.map((item) =>
                    item.thumbnailDataUrl ? (
                      <div key={item.id} className="flex flex-col items-center gap-1.5 shrink-0">
                        <img
                          src={item.thumbnailDataUrl}
                          alt="Previous vial scan"
                          className="w-14 h-14 rounded-xl object-cover border border-border"
                        />
                        <span className="text-[10px] text-muted-foreground">{fmtDate(item.createdAt)}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${triageColor(item.triageResult)}`}>
                          {triageLabel(item.triageResult)}
                        </span>
                      </div>
                    ) : null
                  )}
                  {/* Current scan */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0 ml-auto">
                    <div className="w-14 h-14 rounded-xl border-2 border-primary/50 bg-primary/5 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-primary text-center leading-tight">This<br />scan</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Now</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${triageColor(result.triageResult)}`}>
                      {triageLabel(result.triageResult)}
                    </span>
                  </div>
                </div>
              )}

              {/* Per-category score delta table */}
              {Object.keys(baselineData.categoryAvgs).length > 0 && (
                <div className="rounded-xl border overflow-hidden bg-card">
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_44px_44px_50px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-2 bg-muted/50 border-b">
                    <span>Category</span>
                    <span className="text-right">Prev</span>
                    <span className="text-right">Now</span>
                    <span className="text-right">Change</span>
                  </div>

                  {/* Category rows — skip secondary/noise categories */}
                  {result.categories
                    .filter((c) => baselineData.categoryAvgs[c.category] !== undefined && !['glareInterference', 'crackDamage'].includes(c.category))
                    .map((cat) => {
                      const prev = baselineData.categoryAvgs[cat.category];
                      const delta = cat.score - prev;
                      const sig = Math.abs(delta) > 5;
                      return (
                        <div key={cat.category} className="grid grid-cols-[1fr_44px_44px_50px] px-4 py-3 border-b last:border-0 items-center">
                          <span className="text-xs font-medium text-foreground truncate pr-2">{cat.label}</span>
                          <span className="text-xs text-muted-foreground text-right">{prev}</span>
                          <span className="text-xs font-bold text-right">{cat.score}</span>
                          <span className={`text-xs font-bold text-right ${
                            !sig ? 'text-muted-foreground' :
                            delta > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {!sig ? '—' : delta > 0 ? `+${delta}` : `${delta}`}
                          </span>
                        </div>
                      );
                    })}

                  {/* Overall confidence row */}
                  {(() => {
                    const delta = result.overallConfidence - baselineData.avgConfidence;
                    const sig = Math.abs(delta) > 5;
                    return (
                      <div className="grid grid-cols-[1fr_44px_44px_50px] px-4 py-3 bg-muted/30 items-center border-t">
                        <span className="text-xs font-bold text-foreground">Overall</span>
                        <span className="text-xs text-muted-foreground text-right">{baselineData.avgConfidence}%</span>
                        <span className="text-xs font-bold text-right">{result.overallConfidence}%</span>
                        <span className={`text-xs font-bold text-right ${
                          !sig ? 'text-muted-foreground' :
                          delta > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {!sig ? '—' : delta > 0 ? `+${delta}%` : `${delta}%`}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Scores 0–100 (higher = better). Changes &gt;5 pts are highlighted.
              </p>
            </section>
          )}

          {result.ocrText && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Extracted Label Text</h2>
              <div className="bg-muted p-4 rounded-xl font-mono text-xs text-muted-foreground break-words border">{result.ocrText}</div>
            </section>
          )}

          {/* ── Category Breakdown ── */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Category Breakdown</h2>
            <p className="text-xs text-muted-foreground mb-4">Tap any category for full explanation and technical details.</p>
            <div className="space-y-3">
              {result.categories.map((cat) => (
                <CategoryScoreCard key={cat.category} category={cat} />
              ))}
            </div>
          </section>
        </div>

        <DisclaimerBanner />
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 pt-4 px-4 pb-safe-4 bg-background/95 backdrop-blur border-t space-y-3">
        <button
          onClick={onFinish}
          disabled={saveFailed}
          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-br from-primary to-primary/85 text-primary-foreground py-3.5 rounded-2xl font-bold shadow-md shadow-primary/20 active:scale-[0.98] disabled:opacity-50 transition-all"
        >
          <Save className="w-4 h-4" />
          {saveFailed ? 'Save Failed — See Above' : 'Save Vial Record'}
        </button>
        {shareError && (
          <p className="text-xs text-destructive text-center bg-destructive/10 rounded-xl py-2 px-3">
            {shareError}
          </p>
        )}
        <div className="flex gap-3">
          <button onClick={onRetake} className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-2xl font-semibold text-sm active:scale-[0.98]">
            Retake
          </button>
          <button
            onClick={() => { setShowShareSheet(true); setShareError(null); }}
            disabled={generatingCard || generatingPdf}
            className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-2xl font-semibold text-sm active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {(generatingCard || generatingPdf) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            {generatingCard ? 'Creating…' : generatingPdf ? 'PDF…' : copied ? 'Copied!' : 'Share'}
          </button>
        </div>
        {/* Supplier report — shown for review/DNU results */}
        {(result.triageResult === 'review' || result.triageResult === 'do-not-use') && (
          <button
            onClick={handleSupplierReport}
            className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-3 rounded-2xl font-semibold text-sm active:scale-[0.98]"
          >
            {supplierCopied ? (
              <><CheckCircle2 className="w-4 h-4 text-primary" />Report Copied!</>
            ) : (
              <><Send className="w-4 h-4" />Send to Supplier</>
            )}
          </button>
        )}
        <button onClick={() => setLocation('/limitations')} className="w-full text-center text-xs text-muted-foreground py-1">
          View Limitations →
        </button>
      </div>

      {/* ── Share Sheet ── */}
      {showShareSheet && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowShareSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-background rounded-t-2xl border-t shadow-2xl">
            <div className="px-6 pt-5 pb-10">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-lg">Share Result</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">Choose how to share this screening result</p>
                </div>
                <button onClick={() => setShowShareSheet(false)} className="p-2 rounded-full hover:bg-muted active:bg-muted">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleShareImageCard}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-primary text-primary-foreground active:scale-[0.98] transition-transform"
                >
                  <div className="w-11 h-11 bg-primary-foreground/15 rounded-xl flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-sm">Share Image Card</p>
                    <p className="text-xs opacity-70 mt-0.5">Designed for Instagram, Twitter &amp; WhatsApp</p>
                  </div>
                </button>

                {isPro ? (
                  <button
                    onClick={handleSharePdf}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary border active:scale-[0.98] transition-transform"
                  >
                    <div className="w-11 h-11 bg-muted rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm text-foreground">PDF Report</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Branded report with vial photos included</p>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => { setShowShareSheet(false); rememberUpgradeReturnPath('/scan'); setLocation('/upgrade'); }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary border opacity-70 active:scale-[0.98] transition-transform"
                  >
                    <div className="w-11 h-11 bg-muted rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm text-foreground flex items-center gap-2">
                        PDF Report
                        <span className="text-[9px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary rounded-full px-1.5 py-0.5">Pro</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Unlock with PepScan Pro</p>
                    </div>
                  </button>
                )}

                <button
                  onClick={handleShareText}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary border active:scale-[0.98] transition-transform"
                >
                  <div className="w-11 h-11 bg-muted rounded-xl flex items-center justify-center shrink-0">
                    <Share2 className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-sm text-foreground">Share Text Summary</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Plain text — works on any platform</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
