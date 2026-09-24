import { useState } from 'react';
import { AlertTriangle, Download, Loader2, ShieldCheck } from 'lucide-react';
import { exportClosureArchive } from '@/utils/exportHistory';

export const CLOSING_DATE = '15 October 2026';
export const SCANNING_DISABLED_MESSAGE =
  `Scanning has been switched off. Pepscan is closing on ${CLOSING_DATE}.`;
export const CLOSING_NOTICE =
  `Pepscan is closing on ${CLOSING_DATE} and scanning has been switched off. ` +
  'Thank you for using it. Please export anything you want to keep before then. ' +
  'After that date the app will stop working and all stored data, including scan images and history, ' +
  'will be permanently deleted. Pepscan never gave medical or safety advice; do not rely on any past scan result.';

export function ExportAllButton({ onComplete }: { onComplete?: () => void }) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await exportClosureArchive();
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-md active:scale-[0.98] disabled:opacity-60"
      >
        <span className="flex items-center justify-center gap-2">
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isExporting ? 'Preparing export…' : 'Export all my data'}
        </span>
      </button>
      {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ClosingNoticeModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="closing-notice-title"
        className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 id="closing-notice-title" className="text-xl font-bold">Pepscan is closing</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{CLOSING_NOTICE}</p>
        <div className="mt-5 space-y-3">
          <ExportAllButton />
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-xl border px-4 py-3 text-sm font-semibold"
          >
            Continue
          </button>
        </div>
      </section>
    </div>
  );
}

export default function ClosingScreen() {
  return (
    <main className="min-h-[100dvh] bg-background px-5 pb-safe-8 pt-safe">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center py-10">
        <div className="rounded-3xl border bg-card p-6 shadow-lg">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15">
            <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold">Pepscan is closing</h1>
          <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm font-semibold leading-relaxed">
            {SCANNING_DISABLED_MESSAGE}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{CLOSING_NOTICE}</p>
          <div className="mt-6">
            <ExportAllButton />
          </div>
          <div className="mt-5 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            No data has been deleted. The export contains your saved history, notes, dates, JSON and CSV records,
            plus every saved image available on this device.
          </div>
        </div>
      </div>
    </main>
  );
}