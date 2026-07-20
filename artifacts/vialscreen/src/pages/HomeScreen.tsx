import { useLocation, Link } from 'wouter';
import { 
  Camera, 
  History, 
  BookOpen, 
  AlertTriangle,
  ChevronRight,
  Play
} from 'lucide-react';
import { APP_NAME, APP_TAGLINE, PREPARATION } from '@/constants/copy';
import { loadActiveSession } from '@/utils/storage';
import DisclaimerBanner from '@/components/DisclaimerBanner';

export default function HomeScreen() {
  const [, setLocation] = useLocation();
  const activeSession = loadActiveSession();

  return (
    <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col relative">
      <div className="px-6 py-12 flex-1">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            {APP_NAME}
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-[280px] mx-auto">
            {APP_TAGLINE}
          </p>
        </header>

        <div className="space-y-4">
          {activeSession && !activeSession.finalized && (
            <button
              onClick={() => setLocation('/scan')}
              className="w-full text-left bg-warning/10 border-warning/30 border rounded-xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-warning-foreground text-sm">Resume In-Progress Scan</span>
                <span className="text-xs text-muted-foreground mt-0.5">You have an unfinished screening session</span>
              </div>
              <Play className="w-5 h-5 text-warning-foreground" />
            </button>
          )}

          <button
            onClick={() => setLocation('/scan')}
            className="w-full text-left bg-primary text-primary-foreground rounded-xl p-5 flex items-center justify-between shadow-md active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Start New Scan</h2>
                <p className="text-primary-foreground/80 text-sm mt-0.5">Begin visual screening</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-70" />
          </button>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <Link href="/history" className="bg-card border rounded-xl p-4 flex flex-col gap-3 shadow-sm active:scale-[0.98] transition-transform">
              <History className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">History</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Past scans</p>
              </div>
            </Link>

            <Link href="/setup" className="bg-card border rounded-xl p-4 flex flex-col gap-3 shadow-sm active:scale-[0.98] transition-transform">
              <BookOpen className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">Setup Guide</h3>
                <p className="text-xs text-muted-foreground mt-0.5">How to prepare</p>
              </div>
            </Link>
          </div>

          <Link href="/limitations" className="bg-card border rounded-xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform mt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium text-sm">Limitations & Disclaimers</h3>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

        <div className="mt-10 bg-secondary/50 rounded-xl p-5 border border-secondary">
          <h3 className="text-sm font-semibold mb-3">Quick Inspection Tips</h3>
          <ul className="space-y-2">
            {PREPARATION.steps.items.slice(0, 3).map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                <span className="text-primary font-bold">{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <DisclaimerBanner />
    </div>
  );
}
