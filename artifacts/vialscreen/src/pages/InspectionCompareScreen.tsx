import { useState } from 'react';
import { Link, useParams } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  FileWarning,
  History,
  Minus,
} from 'lucide-react';
import { format } from 'date-fns';
import TriageBadge from '@/components/TriageBadge';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import { loadSession } from '@/utils/storage';
import { useProStatus } from '@/hooks/useProStatus';
import { PRO_PRICE_DISPLAY } from '@/utils/pro';
import { RESULT_COPY } from '@/constants/copy';
import type { CategoryScore, ScanSession } from '@/types';
import { getEarlierComparableSessions, getObservedFindingChanges } from '@/utils/inspectionComparison';

function assessmentLabel(session: ScanSession) {
  const result = session.analysisResult!;
  return result.assessmentOutcome === 'unable-to-assess'
    ? RESULT_COPY.unableToAssess.label
    : RESULT_COPY[result.triageResult].label;
}

function getCategoryPairs(baseline: CategoryScore[], current: CategoryScore[]) {
  const previous = new Map(baseline.map((category) => [category.category, category]));
  return current
    .filter((category) => previous.has(category.category) && !['glareInterference', 'crackDamage'].includes(category.category))
    .map((category) => ({ current: category, previous: previous.get(category.category)! }));
}

export default function InspectionCompareScreen() {
  const { id } = useParams();
  const { isPro, isLoading } = useProStatus();
  const current = id ? loadSession(id) : null;
  const candidates = current ? getEarlierComparableSessions(current) : [];
  const [baselineId, setBaselineId] = useState<string | null>(null);

  if (!current?.analysisResult) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-bold">Inspection not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This saved inspection is no longer available on this device.</p>
        <Link href="/history" className="mt-6 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold">Back to History</Link>
      </div>
    );
  }

  const baseline = candidates.find((session) => session.id === baselineId) ?? candidates[0] ?? null;
  if (!isLoading && !isPro) {
    return (
      <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 pb-4 pt-safe-4 flex items-center gap-4">
          <Link href={`/history/${current.id}`} className="p-2 -ml-2 rounded-full hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-bold">Compare Inspections</h1>
        </header>
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-6 text-center">
            <History className="w-9 h-9 text-primary mx-auto mb-3" />
            <h2 className="font-bold text-lg">Compare repeat inspections with Pro</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              See changed visible findings, factor scores, capture limitations, and notes beside an earlier saved inspection of the same sample.
            </p>
            <Link href="/upgrade" className="mt-5 inline-flex bg-primary text-primary-foreground font-bold text-sm px-5 py-3 rounded-xl">
              Unlock Pro — {PRO_PRICE_DISPLAY}
            </Link>
          </div>
        </div>
        <DisclaimerBanner />
      </div>
    );
  }

  if (!baseline) {
    return (
      <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 pb-4 pt-safe-4 flex items-center gap-4">
          <Link href={`/history/${current.id}`} className="p-2 -ml-2 rounded-full hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-bold">Compare Inspections</h1>
        </header>
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <div>
            <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="font-bold text-lg">No earlier inspection to compare</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Save another assessed scan with the same sample name and scan type, then return here to compare the visible record.
            </p>
          </div>
        </div>
        <DisclaimerBanner />
      </div>
    );
  }

  const currentResult = current.analysisResult;
  const baselineResult = baseline.analysisResult!;
  const changes = getObservedFindingChanges(baseline, current);
  const categoryPairs = getCategoryPairs(baselineResult.categories, currentResult.categories);
  const confidenceDelta = currentResult.overallConfidence - baselineResult.overallConfidence;

  return (
    <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 pb-4 pt-safe-4 flex items-center gap-4">
        <Link href={`/history/${current.id}`} className="p-2 -ml-2 rounded-full hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="min-w-0">
          <h1 className="text-lg font-bold">Compare Inspections</h1>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground truncate">
            {current.metadata.peptideName || 'Saved vial record'}
          </p>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
          This compares earlier saved visual records on this device. It highlights image-based differences only and does not determine safety, identity, purity, potency, or cause.
          {!current.metadata.batchLot.trim() && ' No batch/lot was recorded, so matching uses the same sample name and scan type.'}
        </div>

        {candidates.length > 1 && (
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Earlier inspection</span>
            <select
              value={baseline.id}
              onChange={(event) => setBaselineId(event.target.value)}
              className="mt-2 w-full bg-card border rounded-xl px-3 py-3 text-sm"
            >
              {candidates.map((session) => (
                <option key={session.id} value={session.id}>
                  {format(new Date(session.createdAt), 'MMM d, yyyy · HH:mm')} — {assessmentLabel(session)}
                </option>
              ))}
            </select>
          </label>
        )}

        <section className="grid grid-cols-[1fr_28px_1fr] gap-2 items-stretch">
          <RecordSnapshot label="Earlier" session={baseline} />
          <div className="flex items-center justify-center"><ArrowRight className="w-4 h-4 text-primary" /></div>
          <RecordSnapshot label="This inspection" session={current} current />
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Observed finding changes</h2>
          <div className="space-y-2">
            <ChangeList title="Newly recorded" findings={changes.added} tone="new" empty="No newly worded findings in the saved record." />
            <ChangeList title="No longer recorded" findings={changes.resolved} tone="resolved" empty="No earlier findings disappeared from the record." />
            <ChangeList title="Recorded in both" findings={changes.unchanged} tone="same" empty="No identical finding text was recorded in both scans." />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Visual-factor score changes</h2>
          <div className="rounded-xl border overflow-hidden bg-card">
            <div className="grid grid-cols-[1fr_42px_42px_52px] px-3 py-2 bg-muted/50 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Factor</span><span className="text-right">Then</span><span className="text-right">Now</span><span className="text-right">Change</span>
            </div>
            {categoryPairs.map(({ previous, current: category }) => {
              const delta = category.score - previous.score;
              const significant = Math.abs(delta) > 5;
              return (
                <div key={category.category} className="grid grid-cols-[1fr_42px_42px_52px] px-3 py-3 border-b last:border-0 items-center">
                  <span className="text-xs font-medium truncate pr-1">{category.label}</span>
                  <span className="text-xs text-right text-muted-foreground">{previous.score}</span>
                  <span className="text-xs text-right font-bold">{category.score}</span>
                  <span className={`text-xs text-right font-bold ${!significant ? 'text-muted-foreground' : delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {!significant ? '—' : delta > 0 ? `+${delta}` : delta}
                  </span>
                </div>
              );
            })}
            <div className="grid grid-cols-[1fr_42px_42px_52px] px-3 py-3 bg-muted/30 items-center">
              <span className="text-xs font-bold">Overall confidence</span>
              <span className="text-xs text-right text-muted-foreground">{baselineResult.overallConfidence}%</span>
              <span className="text-xs text-right font-bold">{currentResult.overallConfidence}%</span>
              <span className={`text-xs text-right font-bold ${Math.abs(confidenceDelta) <= 5 ? 'text-muted-foreground' : confidenceDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {Math.abs(confidenceDelta) <= 5 ? '—' : confidenceDelta > 0 ? `+${confidenceDelta}%` : `${confidenceDelta}%`}
              </span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Scores are visual-screening signals from 0–100. Changes over 5 points are highlighted; they are not a laboratory trend.</p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <RecordEvidence title="Earlier record" session={baseline} />
          <RecordEvidence title="This record" session={current} />
        </section>
      </main>
      <DisclaimerBanner />
    </div>
  );
}

function RecordSnapshot({ label, session, current = false }: { label: string; session: ScanSession; current?: boolean }) {
  const result = session.analysisResult!;
  return (
    <div className={`rounded-xl border p-3 ${current ? 'border-primary/40 bg-primary/5' : 'bg-card'}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">{label}</p>
      <TriageBadge result={result.triageResult} assessmentOutcome={result.assessmentOutcome} size="sm" />
      <p className="mt-3 text-xs font-bold">{result.overallConfidence}% confidence</p>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
        <Calendar className="inline w-3 h-3 mr-1 align-[-2px]" />
        {format(new Date(session.createdAt), 'MMM d, yyyy · HH:mm')}
      </p>
      {session.metadata.batchLot && <p className="mt-1 text-[10px] text-muted-foreground break-words">Lot: {session.metadata.batchLot}</p>}
    </div>
  );
}

function ChangeList({ title, findings, tone, empty }: { title: string; findings: string[]; tone: 'new' | 'resolved' | 'same'; empty: string }) {
  const icon = tone === 'new' ? <FileWarning className="w-4 h-4 text-amber-500" /> : tone === 'resolved' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Minus className="w-4 h-4 text-muted-foreground" />;
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2"><span>{icon}</span><p className="text-xs font-bold">{title}</p></div>
      {findings.length ? (
        <ul className="mt-2 space-y-1.5">{findings.map((finding) => <li key={finding} className="text-xs text-muted-foreground leading-relaxed">• {finding}</li>)}</ul>
      ) : <p className="mt-2 text-xs text-muted-foreground">{empty}</p>}
    </div>
  );
}

function RecordEvidence({ title, session }: { title: string; session: ScanSession }) {
  const blockers = session.analysisResult?.qualityBlockers ?? [];
  const hasQualityIssue = session.analysisResult?.assessmentOutcome === 'unable-to-assess' || session.analysisResult?.qualityDegraded;
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">{title}</p>
      <div className="flex gap-1.5 mb-2">
        {session.captures.filter((capture) => capture.thumbDataUrl).slice(0, 2).map((capture) => (
          <img key={capture.id} src={capture.thumbDataUrl} alt="" className="w-12 h-12 rounded-lg object-cover border" />
        ))}
        {!session.captures.some((capture) => capture.thumbDataUrl) && <Camera className="w-5 h-5 text-muted-foreground" />}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {hasQualityIssue
          ? blockers[0]?.title ?? 'Capture quality affected this record.'
          : 'No required capture limitation was recorded.'}
      </p>
      {session.metadata.notes && <p className="mt-2 border-t pt-2 text-[10px] italic text-muted-foreground leading-relaxed">“{session.metadata.notes}”</p>}
    </div>
  );
}