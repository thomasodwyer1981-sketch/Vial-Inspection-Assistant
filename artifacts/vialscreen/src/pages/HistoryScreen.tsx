import { Link } from 'wouter';
import { ArrowLeft, Trash2, AlertTriangle, Lock, Zap, Download, Upload, FileSpreadsheet, FileJson, X as XIcon } from 'lucide-react';
import { getScanHistory, clearHistory, deleteSession } from '@/utils/storage';
import { exportHistoryCsv, exportHistoryJson, importHistoryFile } from '@/utils/exportHistory';
import { useMemo, useRef, useState } from 'react';
import TriageBadge from '@/components/TriageBadge';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import { APPEARANCE_PROFILES } from '@/types';
import type { AppearanceProfile } from '@/types';
import { format } from 'date-fns';
import { useProStatus } from '@/hooks/useProStatus';
import { FREE_HISTORY_LIMIT, PRO_PRICE_DISPLAY } from '@/utils/pro';

const PROFILE_BADGE: Record<
  AppearanceProfile,
  { label: string; className: string } | null
> = {
  // Named peptides — show the compound name as a badge
  'bpc157':     { label: 'BPC-157',      className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  'tb500':      { label: 'TB-500',       className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  'ipamorelin': { label: 'Ipamorelin',   className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  'sermorelin': { label: 'Sermorelin',   className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  'melanotan':  { label: 'Melanotan',    className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  'igf1':       { label: 'IGF-1',        className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  'aod9604':    { label: 'AOD-9604',     className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  'epithalon':  { label: 'Epithalon',    className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  'hcg':        { label: 'HCG',          className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  // Specialty — non-standard expected appearances
  'ghk-cu':     { label: 'GHK-Cu',       className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  'glp1-clear': { label: 'GLP-1',        className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  // Fallbacks — no badge needed (generic)
  'clear-standard': null,
  'unknown-custom': { label: 'Custom',   className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
};

export default function HistoryScreen() {
  const [history, setHistory] = useState(getScanHistory());
  const { isPro, isLoading: proLoading } = useProStatus();
  const [view, setView] = useState<'all' | 'profiles'>('all');
  const [showExport, setShowExport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { imported, skipped } = await importHistoryFile(file);
      setHistory(getScanHistory());
      setShowExport(false);
      alert(
        imported > 0
          ? `Imported ${imported} scan${imported === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped)` : ''}.`
          : 'No new scans to import — everything in that backup is already here.',
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not read that file.');
    }
  };

  // Group scans by peptide name for the "By Vial" profiles view
  const vialProfiles = useMemo(
    () =>
      buildVialProfiles(history).sort(
        (a, b) => new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime(),
      ),
    [history],
  );

  // Free tier: show first FREE_HISTORY_LIMIT scans; locked = the rest
  const visibleHistory = isPro ? history : history.slice(0, FREE_HISTORY_LIMIT);
  const lockedCount = isPro ? 0 : Math.max(0, history.length - FREE_HISTORY_LIMIT);
  const atLimit = !isPro && history.length >= FREE_HISTORY_LIMIT;

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all scan history? This cannot be undone.')) {
      clearHistory();
      setHistory([]);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Delete this scan?')) {
      deleteSession(id);
      setHistory(getScanHistory());
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col relative">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 pb-4 pt-safe-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/home"
            className="p-2 -ml-2 rounded-full hover:bg-muted active:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">
            Scan History
            {history.length > 0 && (
              <span className="text-muted-foreground font-normal text-sm ml-1.5">
                ({isPro ? history.length : `${visibleHistory.length}/${history.length}`})
              </span>
            )}
          </h1>
        </div>
        {history.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowExport(true)}
              className="p-2 rounded-full hover:bg-muted active:bg-muted transition-colors text-muted-foreground"
              aria-label="Export or back up history"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearAll}
              className="text-xs font-semibold text-destructive uppercase tracking-wider p-2"
            >
              Clear All
            </button>
          </div>
        )}
      </header>

      {/* Hidden file input for backup import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* View tabs — only when there's history */}
      {history.length > 0 && (
        <div className="px-4 pt-4 pb-0 flex gap-2">
          <button
            onClick={() => setView('all')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              view === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground'
            }`}
          >
            All Scans
          </button>
          <button
            onClick={() => setView('profiles')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              view === 'profiles' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground'
            }`}
          >
            By Vial
          </button>
        </div>
      )}

      <div className="p-4 flex-1">
        {/* Free tier: at-limit banner */}
        {!proLoading && atLimit && (
          <Link href="/upgrade" className="block mb-4">
            <div className="bg-primary/8 border border-primary/25 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/15 rounded-xl flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {FREE_HISTORY_LIMIT} scan limit reached
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upgrade for unlimited history — {PRO_PRICE_DISPLAY}
                </p>
              </div>
              <div className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Pro
              </div>
            </div>
          </Link>
        )}

        {history.length > 15 && isPro && (
          <div className="mb-3 bg-warning/10 border border-warning/30 rounded-xl p-3 flex gap-3 items-start">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <p className="text-xs text-warning leading-relaxed">
              {history.length} scans saved. Each scan stores images locally — delete older
              scans to free device storage.
            </p>
          </div>
        )}

        {history.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <HistoryIcon />
            </div>
            <h2 className="text-lg font-bold mb-2">No History Yet</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Completed scans will appear here.
            </p>
            <Link
              href="/scan"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-sm"
            >
              Start a Scan
            </Link>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 text-xs text-muted-foreground underline underline-offset-2"
            >
              Restore from a backup file
            </button>
          </div>
        ) : view === 'profiles' ? (
          /* ── By Vial profiles view ── */
          <div className="space-y-3">
            {vialProfiles.map((profile) => (
              <VialProfileCard key={profile.name} profile={profile} />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {groupHistoryByDate(visibleHistory).map(({ label, items: groupItems }) => (
              <div key={label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">
                  {label}
                </p>
                <div className="space-y-3">
                  {groupItems.map((item) => {
                    const profileBadge =
                      item.appearanceProfile
                        ? PROFILE_BADGE[item.appearanceProfile]
                        : null;
                    return (
                      <div key={item.id} className="relative">
                        <Link
                          href={`/history/${item.id}`}
                          className="block bg-card border rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform"
                        >
                          <div className="flex gap-4">
                            {/* Thumbnail */}
                            {item.thumbnailDataUrl ? (
                              <div className="w-16 h-16 bg-black rounded-lg overflow-hidden shrink-0 border">
                                <img
                                  src={item.thumbnailDataUrl}
                                  alt=""
                                  className="w-full h-full object-cover opacity-80"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 bg-secondary rounded-lg shrink-0 border flex items-center justify-center text-xs text-muted-foreground">
                                No Image
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start mb-1">
                                  <h3 className="font-bold text-sm truncate pr-2">
                                    {item.peptideName || 'Unnamed Vial'}
                                  </h3>
                                  <TriageBadge result={item.triageResult} size="sm" className="shrink-0" />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs text-muted-foreground truncate">
                                    {item.vendor || 'No vendor'}
                                  </p>
                                  {item.scanMode === 'powder' && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide shrink-0 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                      Powder
                                    </span>
                                  )}
                                  {profileBadge && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide shrink-0 ${profileBadge.className}`}>
                                      {profileBadge.label}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center mt-2">
                                <span>{format(new Date(item.createdAt), 'MMM d, yyyy · HH:mm')}</span>
                                <span>{item.overallConfidence}% Conf</span>
                              </div>
                            </div>
                          </div>
                        </Link>

                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          className="absolute top-1.5 right-1.5 bg-background border text-muted-foreground hover:text-destructive hover:border-destructive p-2.5 rounded-lg transition-colors shadow-sm"
                          aria-label="Delete scan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Locked scans (free tier only) */}
            {lockedCount > 0 && (
              <Link href="/upgrade" className="block">
                <div className="border-2 border-dashed border-primary/25 rounded-xl p-5 flex flex-col items-center text-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      {lockedCount} older {lockedCount === 1 ? 'scan' : 'scans'} locked
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Upgrade to Pro to see your full history — {PRO_PRICE_DISPLAY}
                    </p>
                  </div>
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Unlock for {PRO_PRICE_DISPLAY}
                  </span>
                </div>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Export / backup sheet ── */}
      {showExport && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowExport(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-background rounded-t-2xl border-t shadow-2xl">
            <div className="px-6 pt-5 pb-10">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-lg">Export &amp; Backup</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Scans are stored on this device only — keep a backup
                  </p>
                </div>
                <button onClick={() => setShowExport(false)} className="p-2 rounded-full hover:bg-muted active:bg-muted">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => { exportHistoryCsv(); setShowExport(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary border active:scale-[0.98] transition-transform"
                >
                  <div className="w-11 h-11 bg-muted rounded-xl flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-sm text-foreground">Export CSV</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Summary table for spreadsheets</p>
                  </div>
                </button>

                <button
                  onClick={() => { exportHistoryJson(); setShowExport(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary border active:scale-[0.98] transition-transform"
                >
                  <div className="w-11 h-11 bg-muted rounded-xl flex items-center justify-center shrink-0">
                    <FileJson className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-sm text-foreground">Back Up (JSON)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Full backup — restore it on any device</p>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary border active:scale-[0.98] transition-transform"
                >
                  <div className="w-11 h-11 bg-muted rounded-xl flex items-center justify-center shrink-0">
                    <Upload className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-sm text-foreground">Restore Backup</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Merge scans from a backup file</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <DisclaimerBanner />
    </div>
  );
}

// ── Vial Profile Card ─────────────────────────────────────────────────────────

type VialProfile = ReturnType<typeof buildVialProfiles>[0];

// ── Date grouping ─────────────────────────────────────────────────────────────

type HistoryItem = ReturnType<typeof getScanHistory>[0];

function groupHistoryByDate(items: HistoryItem[]) {
  const todayStart = new Date(new Date().toDateString()).getTime();
  const weekStart  = todayStart - 6 * 24 * 60 * 60 * 1000;

  const groups = [
    { label: 'Today',     items: [] as HistoryItem[] },
    { label: 'This Week', items: [] as HistoryItem[] },
    { label: 'Earlier',   items: [] as HistoryItem[] },
  ];

  for (const item of items) {
    const t = new Date(item.createdAt).getTime();
    if (t >= todayStart)  groups[0].items.push(item);
    else if (t >= weekStart) groups[1].items.push(item);
    else                  groups[2].items.push(item);
  }

  return groups.filter((g) => g.items.length > 0);
}

function buildVialProfiles(
  history: ReturnType<typeof getScanHistory>,
) {
  const map = new Map<string, typeof history>();
  for (const item of history) {
    const key = item.peptideName?.trim() || '(Unnamed)';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([name, items]) => {
    const sorted = [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return {
      name,
      items: sorted,
      latest: sorted[0],
      passCount: items.filter((i) => i.triageResult === 'pass').length,
      reviewCount: items.filter((i) => i.triageResult === 'review').length,
      doNotUseCount: items.filter((i) => i.triageResult === 'do-not-use').length,
    };
  });
}

function VialProfileCard({ profile }: { profile: VialProfile }) {
  const total = profile.items.length;
  const thumbItems = profile.items.filter((i) => i.thumbnailDataUrl).slice(0, 4);

  // Days since the FIRST scan of this vial (items are sorted newest-first).
  // Reconstituted peptides are commonly used within ~28 days refrigerated,
  // so an aging vial gets a subtle amber cue.
  const earliest = profile.items[profile.items.length - 1];
  const dayN = Math.max(
    1,
    Math.floor((Date.now() - new Date(earliest.createdAt).getTime()) / 86_400_000) + 1,
  );
  const aging = dayN > 28;

  return (
    <Link href={`/history/${profile.latest.id}`} className="block">
      <div className="bg-card border rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-bold text-base truncate">{profile.name}</h3>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide shrink-0 ${
                  aging
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-secondary text-muted-foreground'
                }`}
                title="Days since the first scan of this vial"
              >
                Day {dayN}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} {total === 1 ? 'scan' : 'scans'} · Last: {format(new Date(profile.latest.createdAt), 'MMM d, yyyy')}
              {aging && (
                <span className="text-amber-600 dark:text-amber-400"> · first scanned 28+ days ago</span>
              )}
            </p>
          </div>
          <TriageBadge result={profile.latest.triageResult} size="sm" className="shrink-0" />
        </div>

        {/* Thumbnails */}
        {thumbItems.length > 0 && (
          <div className="flex gap-1.5 mb-3">
            {thumbItems.map((item) => (
              <div key={item.id} className="w-12 h-12 bg-black rounded-lg overflow-hidden border shrink-0">
                <img src={item.thumbnailDataUrl!} alt="" className="w-full h-full object-cover opacity-80" />
              </div>
            ))}
          </div>
        )}

        {/* Verdict breakdown */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {profile.passCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              {profile.passCount} pass
            </span>
          )}
          {profile.reviewCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              {profile.reviewCount} review
            </span>
          )}
          {profile.doNotUseCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              {profile.doNotUseCount} fail
            </span>
          )}
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary">View latest →</span>
        </div>
      </div>
    </Link>
  );
}

function HistoryIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
