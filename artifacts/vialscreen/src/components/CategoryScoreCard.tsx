import { CategoryScore } from '@/types';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface CategoryScoreCardProps {
  category: CategoryScore;
}

export default function CategoryScoreCard({ category }: CategoryScoreCardProps) {
  // Non-pass categories start expanded so users immediately see the explanation
  const [expanded, setExpanded] = useState(category.status !== 'pass');
  const [methodExpanded, setMethodExpanded] = useState(false);

  let statusIcon;
  let statusColor;
  let barColor;
  let statusLabel: string;

  switch (category.status) {
    case 'pass':
      statusIcon = <CheckCircle2 className="w-5 h-5 text-success" />;
      statusColor = 'text-success';
      barColor = 'bg-success';
      statusLabel = 'No visual issue detected';
      break;
    case 'review':
      statusIcon = <AlertCircle className="w-5 h-5 text-warning" />;
      statusColor = 'text-warning';
      barColor = 'bg-warning';
      statusLabel = 'Manual inspection recommended';
      break;
    case 'flag':
      statusIcon = <AlertCircle className="w-5 h-5 text-destructive" />;
      statusColor = 'text-destructive';
      barColor = 'bg-destructive';
      statusLabel = 'Visible issue flagged';
      break;
    case 'unable':
      statusIcon = <HelpCircle className="w-5 h-5 text-muted-foreground" />;
      statusColor = 'text-muted-foreground';
      barColor = 'bg-muted';
      statusLabel = 'Unable to Assess';
      break;
    default:
      statusIcon = <HelpCircle className="w-5 h-5 text-muted-foreground" />;
      statusColor = 'text-muted-foreground';
      barColor = 'bg-muted';
      statusLabel = 'Unknown';
  }

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {statusIcon}
          <div>
            <h3 className="font-semibold text-sm">{category.label}</h3>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${barColor}`} 
              style={{ width: `${category.score}%` }} 
            />
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
      </div>
      
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border/50 bg-secondary/20">
          <p className="text-sm text-foreground leading-relaxed mt-3">
            {category.explanation}
          </p>
          
          <div className="mt-4 pt-3 border-t border-border/50">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setMethodExpanded(!methodExpanded);
              }}
              className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1"
            >
              {methodExpanded ? 'Hide' : 'Show'} Technical Details
            </button>
            {methodExpanded && (
              <p className="mt-2 text-xs text-muted-foreground font-mono leading-relaxed bg-muted/50 p-2 rounded">
                {category.method}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
