import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import {
  Camera,
  History,
  BookOpen,
  AlertTriangle,
  Calculator,
  ChevronRight,
  Play,
  Microscope,
  Moon,
  Sun,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useProStatus } from '@/hooks/useProStatus';
import { APP_NAME } from '@/constants/copy';
import { getScanHistory, loadActiveSession, clearActiveSession } from '@/utils/storage';
import MolecularPattern from '@/components/MolecularPattern';

// PepScan hero icon — phone with vial + scan brackets
function VialHeroIcon({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="11" y="3" width="30" height="46" rx="6" fill="none" stroke="url(#hg)" strokeWidth="1.8" />
      <rect x="19" y="7" width="14" height="3" rx="1.5" fill="url(#hg)" opacity="0.5" />
      <circle cx="26" cy="44" r="2.5" fill="none" stroke="url(#hg)" strokeWidth="1.4" />
      <path d="M17 17 L17 14 L20 14" stroke="#4CD964" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 17 L35 14 L32 14" stroke="#4CD964" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 31 L17 34 L20 34" stroke="#4CD964" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 31 L35 34 L32 34" stroke="#4CD964" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="22" y="18" width="8" height="14" rx="4" fill="none" stroke="#2EDFC8" strokeWidth="1.5" />
      <path d="M22.8 27 L22.8 29 Q22.8 31.5 26 31.5 Q29.2 31.5 29.2 29 L29.2 27 Z" fill="#60C8F0" fillOpacity="0.75" />
      <rect x="23" y="14" width="6" height="5" rx="2" fill="url(#hg)" />
      <defs>
        <linearGradient id="hg" x1="11" y1="3" x2="41" y2="49" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2EDFC8" />
          <stop offset="100%" stopColor="#1BAB98" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function HomeScreen() {
  const [, setLocation] = useLocation();
  // Lazy-init so these localStorage reads only run once (on mount), never on
  // re-renders, and never block React's synchronous render path.
  const [activeSession] = useState<ReturnType<typeof loadActiveSession>>(() => loadActiveSession());
  const [scanCount] = useState<number>(() => getScanHistory().length);
  const { theme, toggleTheme } = useTheme();
  const { isPro, isLoading: proLoading } = useProStatus();

  useEffect(() => {
    import('tesseract.js').catch(() => {});
  }, []);

  return (
    <div className="min-h-[100dvh] max-w-md mx-auto flex flex-col bg-background">
      <MolecularPattern color="#14C9A0" opacity={0.09} />

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="relative z-10 pt-safe px-5 flex items-center justify-between pt-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-card border flex items-center justify-center">
            <VialHeroIcon size={22} />
          </div>
          <span className="text-muted-foreground text-sm font-semibold tracking-wide">{APP_NAME}</span>
          {isPro && (
            <span className="bg-primary text-primary-foreground text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              Pro
            </span>
          )}
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-card border text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Hero ───────────────────────────────────────────── */}
      <div className="relative z-10 px-5 pt-8 pb-6 text-center">
        {/* Radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-64 rounded-full pointer-events-none -z-10"
          style={{ background: 'radial-gradient(circle, rgba(20,201,160,0.15) 0%, transparent 70%)' }}
        />

        <div className="w-24 h-24 mx-auto mb-5 rounded-3xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, rgba(20,201,160,0.15), rgba(20,201,160,0.05))',
            border: '1px solid rgba(20,201,160,0.25)',
            boxShadow: '0 0 32px rgba(20,201,160,0.12)',
          }}
        >
          <VialHeroIcon size={52} />
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
          {APP_NAME}
        </h1>
        <p className="text-sm text-muted-foreground font-medium max-w-[220px] mx-auto leading-relaxed">
          Visual QC for research peptide vials
        </p>

        {scanCount > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground font-medium bg-card border">
            <Microscope className="w-3 h-3" />
            {scanCount} scan{scanCount !== 1 ? 's' : ''} on record
          </div>
        )}
      </div>

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="relative z-10 px-4 flex-1 flex flex-col gap-3 pb-4">

        {/* Resume banner */}
        {activeSession && !activeSession.finalized && (
          <button
            onClick={() => setLocation('/scan')}
            className="w-full text-left rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform bg-amber-500/10 border border-amber-500/25"
          >
            <div>
              <span className="font-semibold text-amber-600 dark:text-amber-400 text-sm">Resume In-Progress Scan</span>
              <p className="text-xs text-muted-foreground mt-0.5">You have an unfinished screening session</p>
            </div>
            <Play className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          </button>
        )}

        {/* Start New Scan — primary CTA */}
        <button
          onClick={() => { clearActiveSession(); setLocation('/scan'); }}
          className="w-full text-left text-white rounded-2xl p-5 flex items-center justify-between active:scale-[0.98] transition-transform"
          style={{
            background: 'linear-gradient(135deg, hsl(168 75% 36%), hsl(168 70% 26%))',
            boxShadow: '0 4px 24px rgba(20,201,160,0.30), 0 1px 0 rgba(255,255,255,0.08) inset',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Start New Scan</h2>
              <p className="text-white/65 text-sm mt-0.5">Begin visual screening</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 opacity-50 shrink-0" />
        </button>

        {/* Secondary grid — coloured identity per feature */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/history"
            className="rounded-2xl p-4 flex flex-col gap-3 active:scale-[0.98] transition-transform bg-primary/[0.08] border border-primary/15 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary shadow-sm">
              <History className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">History</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {scanCount > 0 ? `${scanCount} scan${scanCount !== 1 ? 's' : ''}` : 'Past scans'}
              </p>
            </div>
          </Link>

          <Link
            href="/setup"
            className="rounded-2xl p-4 flex flex-col gap-3 active:scale-[0.98] transition-transform bg-slate-500/[0.07] border border-slate-400/20 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-600 dark:bg-slate-500 shadow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Setup Guide</h3>
              <p className="text-xs text-muted-foreground mt-0.5">How to prepare</p>
            </div>
          </Link>
        </div>

        {/* Reconstitution calculator — amber identity */}
        <Link
          href="/calculator"
          className="rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform bg-amber-500/[0.07] border border-amber-500/20 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500 shadow-sm">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">Reconstitution Calculator</h3>
            <p className="text-xs text-muted-foreground mt-0.5">mg + mL → syringe units per dose</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
        </Link>

        {/* Upgrade to Pro teaser */}
        {!proLoading && !isPro && scanCount <= 2 && (
          <Link
            href="/upgrade"
            className="rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary shadow-sm">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-primary">Unlock Pro — $4.99/yr</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Detailed records · local history · PDF reports</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          </Link>
        )}

        {/* Limitations */}
        <Link
          href="/limitations"
          className="rounded-2xl px-4 py-3.5 flex items-center justify-between active:scale-[0.98] transition-transform bg-card/60 border"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-muted-foreground/70" />
            <span className="text-sm text-muted-foreground font-medium">Limitations &amp; Disclaimers</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
        </Link>

        {/* Privacy Settings */}
        <Link
          href="/privacy-settings"
          className="rounded-2xl px-4 py-3.5 flex items-center justify-between active:scale-[0.98] transition-transform bg-card/60 border"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-muted-foreground/70" />
            <span className="text-sm text-muted-foreground font-medium">Privacy Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
        </Link>
      </div>

      {/* ── Disclaimer ─────────────────────────────────────── */}
      <div className="relative z-10 w-full px-5 pt-3 pb-safe-6 flex items-center justify-center gap-2 border-t">
        <AlertTriangle className="w-3 h-3 text-muted-foreground/70 shrink-0" />
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/80 font-semibold leading-none">
          Visual screening only · does not confirm identity, purity, potency, or safety
        </p>
      </div>
    </div>
  );
}
