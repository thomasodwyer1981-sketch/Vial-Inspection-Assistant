import { useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import {
  Camera,
  History,
  BookOpen,
  AlertTriangle,
  ChevronRight,
  Play,
  Microscope,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { APP_NAME } from '@/constants/copy';
import { getScanHistory, loadActiveSession, clearActiveSession } from '@/utils/storage';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import MolecularPattern from '@/components/MolecularPattern';

// PepScan hero icon — phone with vial + scan brackets
function VialHeroIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Phone body */}
      <rect x="11" y="3" width="30" height="46" rx="6" fill="none" stroke="url(#hg)" strokeWidth="1.8" />
      {/* Phone speaker */}
      <rect x="19" y="7" width="14" height="3" rx="1.5" fill="url(#hg)" opacity="0.5" />
      {/* Home button */}
      <circle cx="26" cy="44" r="2.5" fill="none" stroke="url(#hg)" strokeWidth="1.4" />

      {/* Scan brackets — green */}
      <path d="M17 17 L17 14 L20 14" stroke="#4CD964" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 17 L35 14 L32 14" stroke="#4CD964" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 31 L17 34 L20 34" stroke="#4CD964" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 31 L35 34 L32 34" stroke="#4CD964" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />

      {/* Vial body */}
      <rect x="22" y="18" width="8" height="14" rx="4" fill="none" stroke="#2EDFC8" strokeWidth="1.5" />
      {/* Liquid */}
      <path d="M22.8 27 L22.8 29 Q22.8 31.5 26 31.5 Q29.2 31.5 29.2 29 L29.2 27 Z" fill="#60C8F0" fillOpacity="0.75" />
      {/* Cap */}
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
  const activeSession = loadActiveSession();
  const scanCount = getScanHistory().length;
  const { theme, toggleTheme } = useTheme();

  // Pre-warm Tesseract.js so first-run OCR is faster
  useEffect(() => {
    import('tesseract.js').catch(() => {});
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col">

      {/* ── Dark molecular hero ──────────────────────────── */}
      <div className="relative bg-[#0d1117] overflow-hidden pt-safe">
        <MolecularPattern color="#14C9A0" opacity={0.11} />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-safe right-4 mt-3 z-20 p-2.5 rounded-full bg-white/8 border border-white/12 text-white/60 hover:text-white/90 hover:bg-white/14 active:scale-95 transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Subtle radial glow behind the icon */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(20,201,160,0.12) 0%, transparent 70%)' }}
        />

        {/* Gradient fade into the cards below */}
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to bottom, transparent, hsl(var(--background)))' }} />

        <div className="relative z-10 px-6 pt-16 pb-12 text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
            <VialHeroIcon />
          </div>

          {/* Wordmark */}
          <h1 className="text-4xl font-bold tracking-tight text-white mb-1">
            {APP_NAME}
          </h1>
          <p className="text-sm text-white/45 font-medium max-w-[240px] mx-auto leading-relaxed">
            Phone-camera visual QC for research peptide vials
          </p>

          {/* Scan count pill */}
          {scanCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/8 border border-white/12 rounded-full px-3 py-1.5 text-xs text-white/60 font-medium">
              <Microscope className="w-3 h-3" />
              {scanCount} scan{scanCount !== 1 ? 's' : ''} on record
            </div>
          )}
        </div>
      </div>

      {/* ── Actions ─────────────────────────────────────── */}
      <div className="px-5 -mt-5 relative z-20 space-y-3 pb-4 flex-1">

        {/* Resume in-progress scan */}
        {activeSession && !activeSession.finalized && (
          <button
            onClick={() => setLocation('/scan')}
            className="w-full text-left bg-warning/10 border border-warning/30 rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex flex-col">
              <span className="font-semibold text-warning text-sm">Resume In-Progress Scan</span>
              <span className="text-xs text-muted-foreground mt-0.5">You have an unfinished screening session</span>
            </div>
            <Play className="w-5 h-5 text-warning shrink-0" />
          </button>
        )}

        {/* Start new scan — primary CTA */}
        <button
          onClick={() => { clearActiveSession(); setLocation('/scan'); }}
          className="w-full text-left bg-primary text-primary-foreground rounded-2xl p-5 flex items-center justify-between shadow-lg active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, hsl(168 75% 38%), hsl(168 65% 30%))' }}
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/15 p-3 rounded-xl">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Start New Scan</h2>
              <p className="text-primary-foreground/70 text-sm mt-0.5">Begin visual screening</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 opacity-60 shrink-0" />
        </button>

        {/* Secondary grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/history"
            className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm active:scale-[0.98] transition-transform"
            style={{ boxShadow: '0 2px 12px rgba(20,201,160,0.06)' }}
          >
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <History className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">History</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {scanCount > 0 ? `${scanCount} scan${scanCount !== 1 ? 's' : ''}` : 'Past scans'}
              </p>
            </div>
          </Link>

          <Link
            href="/setup"
            className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm active:scale-[0.98] transition-transform"
            style={{ boxShadow: '0 2px 12px rgba(20,201,160,0.06)' }}
          >
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <BookOpen className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Setup Guide</h3>
              <p className="text-xs text-muted-foreground mt-0.5">How to prepare</p>
            </div>
          </Link>
        </div>

        <Link
          href="/limitations"
          className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-destructive/8 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive/70" />
            </div>
            <h3 className="font-medium text-sm">Limitations & Disclaimers</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </Link>
      </div>

      <DisclaimerBanner />
    </div>
  );
}
