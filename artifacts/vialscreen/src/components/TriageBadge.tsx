import { TriageResult } from '@/types';
import { RESULT_COPY } from '@/constants/copy';

interface TriageBadgeProps {
  result: TriageResult;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function TriageBadge({ result, size = 'md', className = '' }: TriageBadgeProps) {
  const label = RESULT_COPY[result].label;
  
  let colorClass = '';
  switch (result) {
    case 'pass':
      colorClass = 'bg-success/10 text-success border-success/30';
      break;
    case 'review':
      colorClass = 'bg-warning/10 text-warning border-warning/30';
      break;
    case 'do-not-use':
      colorClass = 'bg-destructive/10 text-destructive border-destructive/30';
      break;
  }

  const sizeClass = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  }[size];

  return (
    <span className={`inline-flex items-center font-bold tracking-wide uppercase rounded-full border ${colorClass} ${sizeClass} ${className}`}>
      {label}
    </span>
  );
}
