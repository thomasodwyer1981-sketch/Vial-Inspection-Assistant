import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useScanSession } from '@/hooks/useScanSession';
import { SCAN_COPY, RESULT_COPY } from '@/constants/copy';
import StepProgress from '@/components/StepProgress';
import CaptureButton from '@/components/CaptureButton';
import MediaPreview from '@/components/MediaPreview';
import ChecklistItem from '@/components/ChecklistItem';
import TriageBadge from '@/components/TriageBadge';
import CategoryScoreCard from '@/components/CategoryScoreCard';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import { ArrowLeft, AlertTriangle, HardDrive } from 'lucide-react';
import { ScanStep } from '@/types';
import { loadActiveSession } from '@/utils/storage';

// Inline capture quality tips shown on white/black capture steps
const CAPTURE_TIPS = [
  'Center the vial — fill most of the frame',
  'Use even, diffused light — avoid direct flash',
  'Hold steady — full vial body must be visible',
  'Avoid reflections on the vial face',
];

export default function ScanScreen() {
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
  } = useScanSession();

  // On mount: resume active session from storage or start a fresh one
  useEffect(() => {
    if (!session) {
      const activeSession = loadActiveSession();
      if (activeSession && !activeSession.finalized) {
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

  if (!session || !currentStep) return <div className="min-h-[100dvh] bg-background" />;

  const handleRetake = () => {
    abandonSession();
    setLocation('/scan');
  };

  const handleFinish = () => {
    const saved = finalizeSession();
    if (saved) {
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
    // If still fails, the banner stays — user sees the same error
  };

  const isResults = currentStep === 'results';

  return (
    <div className={`${isResults ? 'h-[100dvh]' : 'min-h-[100dvh]'} bg-background max-w-md mx-auto flex flex-col`}>
      {!isResults && (
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md">
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
        {currentStep === 'white-capture' && <CaptureStep background="white" />}
        {currentStep === 'black-capture' && <CaptureStep background="black" />}
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
  const { session, updateMetadata, advanceStep } = useScanSession();
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    new Array(SCAN_COPY.prepare.checklist.length).fill(false),
  );

  const allChecked = checkedItems.every(Boolean);

  const handleCheck = (index: number, val: boolean) => {
    const newItems = [...checkedItems];
    newItems[index] = val;
    setCheckedItems(newItems);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{SCAN_COPY.prepare.title}</h2>
        <p className="text-muted-foreground text-sm">{SCAN_COPY.prepare.instruction}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 -mx-1 px-1">
        {SCAN_COPY.prepare.checklist.map((item, i) => (
          <ChecklistItem
            key={i}
            label={item}
            checked={checkedItems[i]}
            onCheckedChange={(c) => handleCheck(i, c)}
          />
        ))}

        <div className="mt-8">
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
              type="date"
              placeholder="Purchase Date"
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

      <button
        disabled={!allChecked}
        onClick={advanceStep}
        className="w-full bg-primary text-primary-foreground py-4 px-4 rounded-xl font-bold disabled:opacity-50 transition-opacity active:scale-[0.98]"
      >
        Begin Capture
      </button>
    </div>
  );
}

function CaptureStep({ background }: { background: 'white' | 'black' }) {
  const { addCapture, getCaptureForBackground, advanceStep } = useScanSession();
  const copy = background === 'white' ? SCAN_COPY.whiteCapture : SCAN_COPY.blackCapture;
  const existing = getCaptureForBackground(background);

  return (
    <div className="flex flex-col h-full space-y-5">
      <div>
        <h2 className="text-2xl font-bold mb-2">{copy.title}</h2>
        <p className="text-muted-foreground text-sm">{copy.instruction}</p>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {existing ? (
          <MediaPreview capture={existing} />
        ) : (
          <div className="bg-secondary/50 border-2 border-dashed rounded-xl p-8 text-center aspect-[3/4] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Framing guide overlay */}
            <div className="absolute inset-4 border-2 border-primary/30 rounded-lg pointer-events-none" />
            <div className="absolute inset-[20%] border border-primary/20 rounded pointer-events-none" />
            <p className="text-sm font-medium text-muted-foreground z-10">
              Align vial within the guide marks
            </p>
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

        {/* Capture quality tips — always visible, not dependent on capture state */}
        <div className="bg-secondary/40 rounded-xl p-3 border border-secondary">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Quality Tips
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

      <div className="space-y-3 pt-4 border-t">
        <CaptureButton
          onCapture={(res) => addCapture({ background, ...res })}
          captured={!!existing}
        />
        {existing && (
          <button
            onClick={advanceStep}
            className="w-full bg-foreground text-background py-4 px-4 rounded-xl font-bold active:scale-[0.98] transition-transform"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

function LabelCaptureStep() {
  const { addCapture, getCaptureForBackground, advanceStep } = useScanSession();
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
  const { session, goToStep, runHeuristicAnalysis, advanceStep } = useScanSession();

  const handleAnalyze = async () => {
    advanceStep(); // Advance to analysis step UI immediately
    await runHeuristicAnalysis(); // Then start analysis (isAnalyzing batched with advanceStep)
  };

  const captures = session?.captures ?? [];

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
  const { session, analysisError, analysisStatus, isAnalyzing, runHeuristicAnalysis } = useScanSession();

  // Safety-net: if this step renders without analysis running (e.g., session was
  // resumed with currentStep stuck at 'analysis'), auto-trigger once on mount.
  // In the normal flow, isAnalyzing is already true when this component first mounts
  // because ReviewStep calls setIsAnalyzing(true) before advanceStep — React 18
  // batches both updates, so the component mounts with isAnalyzing === true.
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
            {/* Surface a helpful note when OCR engine is loading — prevents "frozen" perception */}
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

interface ResultsStepProps {
  onFinish: () => void;
  onRetake: () => void;
  saveFailed: boolean;
  onRetrySave: () => void;
  onClearSaveFailure: () => void;
}

function ResultsStep({ onFinish, onRetake, saveFailed, onRetrySave, onClearSaveFailure }: ResultsStepProps) {
  const { session } = useScanSession();
  const [, setLocation] = useLocation();
  const result = session?.analysisResult;

  // Null guard — if somehow results step renders without a result, show recovery state
  if (!result) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center space-y-6 px-6">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Result Not Available</h2>
          <p className="text-sm text-muted-foreground">
            The analysis result could not be loaded. You can retake the scan or return home.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={onRetake}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold"
          >
            Start New Scan
          </button>
          <button
            onClick={() => setLocation('/home')}
            className="w-full bg-secondary text-secondary-foreground py-3 rounded-xl font-semibold text-sm"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const resultCopy = RESULT_COPY[result.triageResult];

  return (
    <div className="flex flex-col h-full">
      {/* Save failure banner — shown instead of a separate screen so result stays visible */}
      {saveFailed && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-3">
          <div className="flex items-start gap-3">
            <HardDrive className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-destructive mb-0.5">Scan could not be saved</p>
              <p className="text-xs text-destructive/80 leading-relaxed">
                Device storage may be full. Free space by deleting older scans, then try again.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { onClearSaveFailure(); setLocation('/history'); }}
              className="flex-1 bg-destructive/15 text-destructive text-xs font-bold py-2 px-3 rounded-lg"
            >
              Free Space →
            </button>
            <button
              onClick={onRetrySave}
              className="flex-1 bg-destructive text-destructive-foreground text-xs font-bold py-2 px-3 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Scrollable result content */}
      <div className="flex-1 overflow-y-auto">
        {/* Result header */}
        <div className="bg-card border-b px-6 py-10 text-center">
          <TriageBadge result={result.triageResult} size="lg" className="mb-5" />
          <h1 className="text-2xl font-bold tracking-tight mb-3">
            {resultCopy.summary}
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-4">
            {resultCopy.caveat}
          </p>

          {/* Recommended action */}
          <div className="mt-4 bg-secondary/70 rounded-xl p-4 text-sm text-foreground text-left border">
            <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Recommended Action
            </p>
            <p className="leading-relaxed">{resultCopy.action}</p>
          </div>

          {/* Low confidence badge */}
          {result.overallConfidence < 50 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              Low Confidence Score ({result.overallConfidence}%)
            </div>
          )}
        </div>

        <div className="p-6 space-y-8">
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Primary Findings
            </h2>
            <ul className="space-y-3">
              {result.primaryReasons.map((reason, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-sm text-foreground bg-secondary/50 p-4 rounded-xl border"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{reason}</span>
                </li>
              ))}
            </ul>
          </section>

          {result.ocrText && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Extracted Label Text
              </h2>
              <div className="bg-muted p-4 rounded-xl font-mono text-xs text-muted-foreground break-words border">
                {result.ocrText}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Category Breakdown
            </h2>
            <div className="space-y-3">
              {result.categories.map((cat) => (
                <CategoryScoreCard key={cat.category} category={cat} />
              ))}
            </div>
          </section>
        </div>

        <DisclaimerBanner />
      </div>

      {/* Sticky footer — flex-based, not viewport-fixed */}
      <div className="shrink-0 p-4 bg-background/95 backdrop-blur border-t space-y-3">
        <button
          onClick={onFinish}
          disabled={saveFailed}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold shadow-md active:scale-[0.98] disabled:opacity-50"
        >
          {saveFailed ? 'Save Failed — See Above' : 'Save & Finish'}
        </button>
        <div className="flex gap-3">
          <button
            onClick={onRetake}
            className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-semibold text-sm active:scale-[0.98]"
          >
            Retake Scan
          </button>
          <button
            onClick={() => setLocation('/limitations')}
            className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-semibold text-sm active:scale-[0.98]"
          >
            View Limitations
          </button>
        </div>
      </div>
    </div>
  );
}
