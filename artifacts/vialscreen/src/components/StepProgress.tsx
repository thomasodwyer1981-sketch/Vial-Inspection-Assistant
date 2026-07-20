import { SCAN_STEPS, ScanStep, SCAN_STEP_LABELS } from '@/types';
import { Check } from 'lucide-react';

interface StepProgressProps {
  currentStep: ScanStep;
}

export default function StepProgress({ currentStep }: StepProgressProps) {
  const currentIndex = SCAN_STEPS.indexOf(currentStep);

  return (
    <div className="w-full bg-background border-b px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Step {currentIndex + 1} of {SCAN_STEPS.length}
        </span>
        <span className="text-xs font-semibold text-primary">
          {SCAN_STEP_LABELS[currentStep]}
        </span>
      </div>
      <div className="flex gap-1">
        {SCAN_STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          
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
