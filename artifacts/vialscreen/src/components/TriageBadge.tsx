import { CheckCircle2, Eye, XCircle } from 'lucide-react';
import type { TriageResult } from '@/types';
import { RESULT_COPY } from '@/constants/copy';

interface TriageBadgeProps {
  result: TriageResult;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CONFIG = {
  pass: {
    Icon: CheckCircle2,
    pill: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400',
    heroRing: 'border-emerald-500/30',
    heroBg: 'bg-emerald-500/10',
    heroIcon: 'text-emerald-500',
    heroBadge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    glow: 'shadow-[0_0_28px_rgba(16,185,129,0.18)]',
  },
  review: {
    Icon: Eye,
    pill: 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400',
    heroRing: 'border-amber-500/30',
    heroBg: 'bg-amber-500/10',
    heroIcon: 'text-amber-500',
    heroBadge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
    glow: 'shadow-[0_0_28px_rgba(245,158,11,0.18)]',
  },
  'do-not-use': {
    Icon: XCircle,
    pill: 'bg-red-500/10 text-red-600 border-red-500/25 dark:text-red-400',
    heroRing: 'border-red-500/30',
    heroBg: 'bg-red-500/10',
    heroIcon: 'text-red-500',
    heroBadge: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20',
    glow: 'shadow-[0_0_28px_rgba(239,68,68,0.22)]',
  },
} as const;

export default function TriageBadge({
  result,
  size = 'md',
  className = '',
}: TriageBadgeProps) {
  const label = RESULT_COPY[result].label;
  const cfg = CONFIG[result];
  const { Icon } = cfg;

  // ── Large hero badge (results screen + history detail) ────
  if (size === 'lg') {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <div
          className={`
            w-24 h-24 rounded-full border-2 flex items-center justify-center
            ${cfg.heroBg} ${cfg.heroRing} ${cfg.glow}
          `}
        >
          <Icon className={`w-11 h-11 ${cfg.heroIcon}`} strokeWidth={1.6} />
        </div>
        <span
          className={`
            inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
            text-xs font-bold uppercase tracking-widest border
            ${cfg.heroBadge}
          `}
        >
          {label}
        </span>
      </div>
    );
  }

  // ── Medium & small pill ───────────────────────────────────
  const sizeClass = {
    sm: 'text-[9px] px-1.5 py-0.5 gap-1',
    md: 'text-[10px] px-2 py-0.5 gap-1',
  }[size];

  return (
    <span
      className={`
        inline-flex items-center font-bold tracking-wide uppercase rounded-full border
        ${cfg.pill} ${sizeClass} ${className}
      `}
    >
      <Icon className="w-2.5 h-2.5 shrink-0" />
      {label}
    </span>
  );
}
