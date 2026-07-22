import { useEffect, useRef, useState } from 'react';
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
import { ArrowLeft, AlertTriangle, HardDrive, Palette, CheckCircle2, Share2, ImageIcon, FileText, X as XIcon, Lock, Zap, Layers } from 'lucide-react';
import { shareOrDownloadCard } from '@/utils/shareCard';
import { ScanStep } from '@/types';
import { loadActiveSession } from '@/utils/storage';
import { useProStatus } from '@/hooks/useProStatus';
import { PRO_PRICE_DISPLAY } from '@/utils/pro';

// Inline capture quality tips shown on white/black capture steps
const CAPTURE_TIPS = [
  'Center the vial — fill most of the frame',
  'Use even, diffused light — avoid direct flash',
  'Hold steady — full vial body must be visible',
  'Avoid reflections on the vial face',
];

// Appearance profile options in display order
const PROFILE_OPTIONS: AppearanceProfile[] = ['clear-standard', 'glp1-clear', 'ghk-cu', 'unknown-custom'];

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
  const [, navigate] = useLocation();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const scanMode: ScanMode = (session?.metadata.scanMode ?? 'reconstituted') as ScanMode;
  const isPowder = scanMode === 'powder';

  const activeChecklist = isPowder
    ? SCAN_COPY.prepare.powderChecklist
    : SCAN_COPY.prepare.checklist;

  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    new Array(activeChecklist.length).fill(false),
  );

  // Reset checklist when scan mode changes
  const prevScanModeRef = useRef<ScanMode>(scanMode);
  useEffect(() => {
    if (prevScanModeRef.current !== scanMode) {
      prevScanModeRef.current = scanMode;
      setCheckedItems(new Array(activeChecklist.length).fill(false));
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
                  Pre-mix powder scanning is part of PepScan Pro — one-time {PRO_PRICE_DISPLAY} unlock.
                </p>
                <button
                  onClick={() => navigate('/upgrade')}
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
                return (
                  <button
                    key={profile}
                    onClick={() => handleProfileSelect(profile)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
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
                        <p className="font-semibold text-sm leading-snug">{info.label}</p>
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
            <input
              type="text"
              placeholder="Peptide / Compound Name"
              className="w-full bg-card border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={session?.metadata.peptideName || ''}
              onChange={(e) => updateMetadata({ peptideName: e.target.value })}
            />
            <input
              type="text"
              placeholder="Vendor / Source"
              className="w-full bg-card border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={session?.metadata.vendor || ''}
              onChange={(e) => updateMetadata({ vendor: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Batch / Lot #"
                className="w-full bg-card border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={session?.metadata.batchLot || ''}
                onChange={(e) => updateMetadata({ batchLot: e.target.value })}
              />
              <input
                type="text"
                placeholder="Concentration"
                className="w-full bg-card border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={session?.metadata.concentration || ''}
                onChange={(e) => updateMetadata({ concentration: e.target.value })}
              />
            </div>
            <input
              type="text"
              placeholder="Purchase Date (e.g. 12/07/2026)"
              className="w-full bg-card border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              value={session?.metadata.purchaseDate || ''}
              onChange={(e) => updateMetadata({ purchaseDate: e.target.value })}
            />
            <textarea
              placeholder="Notes (optional)"
              rows={2}
              className="w-full bg-card border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              value={session?.metadata.notes || ''}
              onChange={(e) => updateMetadata({ notes: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Gate button on profile selection (liquid) and checklist (both modes) */}
      <div className="space-y-2 pt-2">
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
          className="w-full bg-primary text-primary-foreground py-4 px-4 rounded-xl font-bold disabled:opacity-40 transition-opacity active:scale-[0.98]"
        >
          Begin Capture
        </button>
      </div>
    </div>
  );
}

function DualCaptureStep() {
  const { session, addCapture, getCaptureForBackground, advanceStep, currentStep } = useScanSessionContext();
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
        {(['white', 'black'] as const).map((bg, i) => {
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
      <div className="space-y-3 pt-4 border-t">
        <CaptureButton
          onCapture={(res) => addCapture({ background: activeBackground, ...res })}
          captured={!!existing}
          background={activeBackground}
        />
        {existing && (
          <button
            onClick={isBlackPhase ? advanceStep : handleSwitchToBlack}
            className="w-full bg-foreground text-background py-4 px-4 rounded-xl font-bold active:scale-[0.98] transition-transform"
          >
            {isBlackPhase ? 'Continue →' : 'Switch to Black Background →'}
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

      <div className="space-y-3 pt-4 border-t">
        <button
          onClick={advanceStep}
          className="w-full bg-foreground text-background py-4 px-4 rounded-xl font-bold active:scale-[0.98] transition-transform"
        >
          {label1 ? 'Continue to Review' : 'Skip Label Capture'}
        </button>
      </div>
    </div>
  );
}

function ReviewStep() {
  const { session, goToStep, runHeuristicAnalysis, advanceStep } = useScanSessionContext();

  const handleAnalyze = async () => {
    advanceStep(); // Advance to analysis step UI immediately
    await runHeuristicAnalysis();
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

      <div className="pt-4 border-t space-y-3">
        <button
          onClick={handleAnalyze}
          className="w-full bg-primary text-primary-foreground py-4 px-4 rounded-xl font-bold shadow-md active:scale-[0.98] transition-transform"
        >
          Run Analysis
        </button>
        <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-wider">
          Runs locally • No data sent
        </p>
      </div>
    </div>
  );
}

function AnalysisStep() {
  const { session, analysisError, analysisStatus, isAnalyzing, runHeuristicAnalysis } = useScanSessionContext();

  // Safety-net: if this step renders without analysis running (e.g., session was
  // resumed with currentStep stuck at 'analysis'), auto-trigger once on mount.
  useEffect(() => {
    if (!isAnalyzing && !session?.analysisResult && !analysisError) {
      runHeuristicAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally mount-only — safety net for stale resumed sessions

  const isOcrPhase =
    analysisStatus.toLowerCase().includes('ocr') ||
    analysisStatus.toLowerCase().includes('label') ||
    analysisStatus.toLowerCase().includes('downloading') ||
    analysisStatus.toLowerCase().includes('initializing');

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
            onClick={runHeuristicAnalysis}
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
  const [copied, setCopied] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);
  const result = session?.analysisResult;

  // Text share — plain summary for any platform
  const handleShareText = async () => {
    if (!result) return;
    setShowShareSheet(false);
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
    try {
      await shareOrDownloadCard({
        triageResult: result.triageResult,
        overallConfidence: result.overallConfidence,
        peptideName: session?.metadata.peptideName,
        vendor: session?.metadata.vendor,
        primaryReasons: result.primaryReasons,
      });
    } catch { /* silently fail */ } finally {
      setGeneratingCard(false);
    }
  };

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
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-4">{resultCopy.caveat}</p>

          {/* Recommended action */}
          <div className="mt-4 bg-secondary/70 rounded-xl p-4 text-sm text-foreground text-left border">
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
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold shadow-md active:scale-[0.98] disabled:opacity-50"
        >
          {saveFailed ? 'Save Failed — See Above' : 'Save Vial Record'}
        </button>
        <div className="flex gap-3">
          <button onClick={onRetake} className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-semibold text-sm active:scale-[0.98]">
            Retake
          </button>
          <button
            onClick={() => setShowShareSheet(true)}
            disabled={generatingCard}
            className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-semibold text-sm active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Share2 className="w-4 h-4" />
            {generatingCard ? 'Creating…' : copied ? 'Copied!' : 'Share'}
          </button>
        </div>
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

                <button
                  onClick={handleShareText}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary border active:scale-[0.98] transition-transform"
                >
                  <div className="w-11 h-11 bg-muted rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-foreground" />
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
