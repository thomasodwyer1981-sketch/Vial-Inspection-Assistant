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
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { ScanStep } from '@/types';
import { loadActiveSession } from '@/utils/storage';

export default function ScanScreen() {
  const [, setLocation] = useLocation();
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
    abandonSession
  } = useScanSession();

  // If we arrive and no session, resume active one from storage or start fresh
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

  // Handle analysis completion
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
    finalizeSession();
    setLocation('/history');
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
          />
        )}
      </main>
    </div>
  );
}

// --- Step Components ---

function PrepareStep() {
  const { session, updateMetadata, advanceStep } = useScanSession();
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    new Array(SCAN_COPY.prepare.checklist.length).fill(false)
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
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Optional Details</h3>
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
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{copy.title}</h2>
        <p className="text-muted-foreground text-sm">{copy.instruction}</p>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-6">
        {existing ? (
          <MediaPreview capture={existing} />
        ) : (
          <div className="bg-secondary/50 border-2 border-dashed rounded-xl p-8 text-center aspect-[3/4] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Framing Guide */}
            <div className="absolute inset-4 border-2 border-primary/30 rounded-lg pointer-events-none" />
            <div className="absolute inset-[20%] border border-primary/20 rounded pointer-events-none" />
            
            <p className="text-sm font-medium text-muted-foreground z-10">
              Align vial within the guide marks
            </p>
          </div>
        )}

        <ul className="space-y-2">
          {copy.tips.map((tip, i) => (
            <li key={i} className="text-xs text-muted-foreground flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
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

        <p className="text-xs text-muted-foreground mt-4">{copy.optional}</p>
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
    advanceStep(); // Go to analysis step loading screen
    await runHeuristicAnalysis();
  };

  const captures = session?.captures ?? [];

  // Guard: no captures at all — user somehow reached review without capturing anything
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

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{SCAN_COPY.review.title}</h2>
        <p className="text-muted-foreground text-sm">{SCAN_COPY.review.instruction}</p>
      </div>

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
  const { analysisError, analysisStatus, runHeuristicAnalysis } = useScanSession();

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
            <div className="absolute inset-0 w-24 h-24 border-4 border-muted rounded-full"></div>
            <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-3">{SCAN_COPY.analysis.title}</h2>
            {/* Live status — updates as engine progresses; OCR phase shown here */}
            <p className="text-sm text-muted-foreground min-h-[40px] leading-relaxed transition-opacity">
              {analysisStatus || SCAN_COPY.analysis.instruction}
            </p>
            {/* Surfaced when OCR engine is loading so users don't think it's frozen */}
            {analysisStatus.toLowerCase().includes('ocr') || analysisStatus.toLowerCase().includes('label') ? (
              <p className="mt-3 text-xs text-muted-foreground/70 italic">
                First-run OCR may take 10–30 s while the engine loads.
              </p>
            ) : null}
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            {SCAN_COPY.analysis.note}
          </p>
        </>
      )}
    </div>
  );
}

function ResultsStep({ onFinish, onRetake }: { onFinish: () => void, onRetake: () => void }) {
  const { session } = useScanSession();
  const [, setLocation] = useLocation();
  const result = session?.analysisResult;

  if (!result) return null;

  const resultCopy = RESULT_COPY[result.triageResult];

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
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

          {/* Recommended action for this result */}
          <div className="mt-4 bg-secondary/70 rounded-xl p-4 text-sm text-foreground text-left border">
            <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Recommended Action</p>
            <p className="leading-relaxed">{resultCopy.action}</p>
          </div>

          {result.overallConfidence < 50 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              Low Confidence Score ({result.overallConfidence}%)
            </div>
          )}
        </div>

        <div className="p-6 space-y-8">
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Primary Findings</h2>
            <ul className="space-y-3">
              {result.primaryReasons.map((reason, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground bg-secondary/50 p-4 rounded-xl border">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{reason}</span>
                </li>
              ))}
            </ul>
          </section>

          {result.ocrText && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Extracted Label Text</h2>
              <div className="bg-muted p-4 rounded-xl font-mono text-xs text-muted-foreground break-words border">
                {result.ocrText}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Category Breakdown</h2>
            <div className="space-y-3">
              {result.categories.map((cat) => (
                <CategoryScoreCard key={cat.category} category={cat} />
              ))}
            </div>
          </section>
        </div>

        <DisclaimerBanner />
      </div>

      {/* Sticky footer — stays at bottom inside flex column, no viewport-fixed positioning */}
      <div className="shrink-0 p-4 bg-background/95 backdrop-blur border-t space-y-3">
        <button
          onClick={onFinish}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold shadow-md active:scale-[0.98]"
        >
          Save & Finish
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
