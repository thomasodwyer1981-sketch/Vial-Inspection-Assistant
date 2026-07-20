import { ScanStep, SCAN_STEP_LABELS } from '@/types';

interface StepProgressProps {
  currentStep: ScanStep;
}

// Only the steps that require user action count toward the progress indicator.
// "analysis" and "results" are system states, not numbered steps.
const USER_STEPS: ScanStep[] = ['prepare', 'white-capture', 'black-capture', 'label-capture', 'review'];

export default function StepProgress({ currentStep }: StepProgressProps) {
  const currentIndex = USER_STEPS.indexOf(currentStep);
  // During analysis / results, show all bars filled (step 5 of 5 complete)
  const displayIndex = currentIndex === -1 ? USER_STEPS.length : currentIndex;

  return (
    <div className="w-full bg-background border-b px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Step {Math.min(displayIndex + 1, USER_STEPS.length)} of {USER_STEPS.length}
        </span>
        <span className="text-xs font-semibold text-primary">
          {SCAN_STEP_LABELS[currentStep]}
        </span>
      </div>
      <div className="flex gap-1">
        {USER_STEPS.map((step, idx) => {
          const isCompleted = idx < displayIndex;
          const isCurrent = idx === displayIndex;
          
          return (
            <div 
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                isCompleted ? 'bg-primary' :
                isCurrent ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
