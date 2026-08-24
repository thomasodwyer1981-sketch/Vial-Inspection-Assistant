import { Link, useLocation, useParams } from 'wouter';
import { useState } from 'react';
import {
  ArrowLeft,
  Trash2,
  Calendar,
  FlaskConical,
  Building2,
  Beaker,
  Tag,
  AlertTriangle,
  Palette,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  GitCompareArrows,
  Lock,
  Loader2,
} from 'lucide-react';
import { loadSession, deleteSession, getHistoryForSampleName } from '@/utils/storage';
import { RESULT_COPY } from '@/constants/copy';
import { APPEARANCE_PROFILES } from '@/types';
import { format } from 'date-fns';
import TriageBadge from '@/components/TriageBadge';
import CategoryScoreCard from '@/components/CategoryScoreCard';
import MediaPreview from '@/components/MediaPreview';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import { useProStatus } from '@/hooks/useProStatus';
import { PRO_PRICE_DISPLAY, rememberUpgradeReturnPath } from '@/utils/pro';
import { buildInspectionReportInput } from '@/utils/inspectionReport';
import { shareOrDownloadPdf } from '@/utils/sharePdf';
import { buildReportComparison, getEarlierComparableSessions } from '@/utils/inspectionComparison';

export default function HistoryDetailScreen() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const session = id ? loadSession(id) : null;
  const { isPro, isLoading: proLoading } = useProStatus();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  if (!session || !session.analysisResult) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Scan Not Found</h2>
        <p className="text-muted-foreground mb-6 text-sm">This scan may have been deleted or never completed.</p>
        <Link href="/history" className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold">
          Back to History
        </Link>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this scan record?')) {
      deleteSession(session.id);
      setLocation('/history');
    }
  };

  const result = session.analysisResult;
  const { metadata } = session;
  const assessmentUnavailable = result.assessmentOutcome === 'unable-to-assess';
  const resultCopy = assessmentUnavailable
    ? RESULT_COPY.unableToAssess
    : RESULT_COPY[result.triageResult];

  // Resolve profile — prefer result.profileUsed (accurate at time of analysis),
  // fall back to metadata.appearanceProfile for older sessions.
  // Old sessions without either field get null (graceful fallback).
  const profileUsed = result.profileUsed ?? metadata.appearanceProfile ?? null;
  const profileInfo = profileUsed ? APPEARANCE_PROFILES[profileUsed] : null;

  // Only show the metadata section if at least one field has a value
  const hasMetadata = !!(
    metadata.peptideName || metadata.vendor || metadata.batchLot ||
    metadata.concentration || metadata.purchaseDate || metadata.notes ||
    profileUsed
  );

  // Baseline comparison — previous scans of the same peptide, excluding this one
  const baselineHistory = metadata.peptideName?.trim()
    ? getHistoryForSampleName(metadata.peptideName, metadata.scanMode)
        .filter((h) => h.id !== session.id)
        .slice(0, 5)
    : [];

  // Trend: compare this result's confidence to the last scan's confidence
  const lastScan = baselineHistory[0] ?? null;
  const confidenceDelta = lastScan
    ? result.overallConfidence - lastScan.overallConfidence
    : null;
  const earlierComparableSessions = getEarlierComparableSessions(session);

  const handlePdfReport = async () => {
    setGeneratingPdf(true);
    setReportError(null);
    try {
      const comparison = earlierComparableSessions[0]
        ? buildReportComparison(session, earlierComparableSessions[0])
        : undefined;
      await shareOrDownloadPdf(buildInspectionReportInput(session, comparison));
    } catch {
      setReportError('Could not generate the PDF report. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col relative">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 pb-4 pt-safe-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/history" className="p-2 -ml-2 rounded-full hover:bg-muted active:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight truncate max-w-[200px]">
              {metadata.peptideName || 'Scan Details'}
            </h1>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              {format(new Date(session.createdAt), 'MMM d, yyyy HH:mm')}
            </span>
          </div>
        </div>
        <button onClick={handleDelete} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      <div className="p-6 space-y-8 pb-6">
        {/* Triage Header */}
        <div className="bg-card border rounded-2xl p-6 text-center shadow-sm">
          <TriageBadge
            result={result.triageResult}
            assessmentOutcome={result.assessmentOutcome}
            size="lg"
            className="mb-4"
          />
          <p className="text-sm text-foreground font-medium mb-3 leading-relaxed">
            {resultCopy.summary}
          </p>
          <div className="inline-block bg-secondary px-3 py-1.5 rounded-lg text-xs font-bold text-secondary-foreground mb-2">
            Overall Confidence: {result.overallConfidence}%
          </div>

          {result.overallConfidence < 50 && (
            <div className="mt-2 mb-2 inline-flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Confidence — results less reliable
            </div>
          )}

          {/* Appearance profile note */}
          {profileInfo && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span>Profile: <span className="font-semibold text-foreground">{profileInfo.label}</span></span>
            </div>
          )}

          {/* Recommended action */}
          <div className="mt-4 bg-secondary/70 rounded-xl p-4 text-sm text-foreground text-left border">
            <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Recommended Action</p>
            <p className="leading-relaxed">{resultCopy.action}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {isPro ? (
              <button
                onClick={handlePdfReport}
                disabled={generatingPdf}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-3 py-3 text-xs font-bold disabled:opacity-60"
              >
                {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {generatingPdf ? 'Creating…' : 'PDF Report'}
              </button>
            ) : (
              <button
                onClick={() => { rememberUpgradeReturnPath(`/history/${session.id}`); setLocation('/upgrade'); }}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 text-primary px-3 py-3 text-xs font-bold"
              >
                <Lock className="w-4 h-4" /> PDF Report · Pro
              </button>
            )}
            {earlierComparableSessions.length > 0 ? (
              isPro ? (
                <Link
                  href={`/history/${session.id}/compare`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-secondary border px-3 py-3 text-xs font-bold"
                >
                  <GitCompareArrows className="w-4 h-4" /> Compare
                </Link>
              ) : (
                <button
                  onClick={() => { rememberUpgradeReturnPath(`/history/${session.id}`); setLocation('/upgrade'); }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-secondary border px-3 py-3 text-xs font-bold"
                >
                  <Lock className="w-4 h-4" /> Compare · Pro
                </button>
              )
            ) : (
              <div className="rounded-xl bg-secondary/60 px-3 py-3 text-[10px] text-muted-foreground flex items-center justify-center text-center">
                Save a repeat scan to compare
              </div>
            )}
          </div>
          {!proLoading && !isPro && (
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
              Pro adds full visual-factor explanations, saved-record PDF reports, and comparisons with earlier scans — {PRO_PRICE_DISPLAY}.
            </p>
          )}
          {reportError && <p className="mt-3 text-xs text-destructive">{reportError}</p>}
        </div>

        {/* Metadata — only if at least one field has a value */}
        {hasMetadata && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Vial Information</h2>
            <div className="bg-card border rounded-xl overflow-hidden text-sm">
              <MetaRow icon={<FlaskConical className="w-4 h-4"/>} label="Name" value={metadata.peptideName} />
              <MetaRow icon={<Building2 className="w-4 h-4"/>} label="Vendor" value={metadata.vendor} />
              <MetaRow icon={<Tag className="w-4 h-4"/>} label="Batch/Lot" value={metadata.batchLot} />
              <MetaRow icon={<Beaker className="w-4 h-4"/>} label="Concentration" value={metadata.concentration} />
              <MetaRow icon={<Calendar className="w-4 h-4"/>} label="Purchase Date" value={metadata.purchaseDate} />
              {profileInfo && (
                <MetaRow
                  icon={<Palette className="w-4 h-4"/>}
                  label="Appearance Profile"
                  value={profileInfo.label}
                  border={false}
                />
              )}
              {!profileInfo && (
                <MetaRow
                  icon={<Palette className="w-4 h-4"/>}
                  label="Appearance Profile"
                  value="Not specified"
                  border={false}
                />
              )}
            </div>
            {metadata.notes && (
              <div className="mt-3 bg-secondary/50 p-4 rounded-xl border text-sm text-foreground italic">
                "{metadata.notes}"
              </div>
            )}
          </section>
        )}

        {/* Captures — full dataUrls are stripped on save to stay within the
            localStorage quota; small thumbnails survive persistence. */}
        {session.captures.filter((c) => c.dataUrl || c.thumbDataUrl).length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Captures</h2>
            <div className="grid grid-cols-2 gap-3">
              {session.captures.filter((c) => c.dataUrl || c.thumbDataUrl).map((c) => (
                <MediaPreview key={c.id} capture={c} />
              ))}
            </div>
          </section>
        )}

        {/* Baseline Comparison — only shown when previous scans exist for same peptide */}
        {baselineHistory.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Scan History — {metadata.peptideName}
            </h2>
            <div className="bg-card border rounded-xl overflow-hidden">
              {/* Trend indicator */}
              {confidenceDelta !== null && (
                <div className="flex items-center gap-3 px-4 py-3 border-b bg-secondary/30">
                  {confidenceDelta > 3 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                        Confidence up {confidenceDelta}% from last scan
                      </span>
                    </>
                  ) : confidenceDelta < -3 ? (
                    <>
                      <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                        Confidence down {Math.abs(confidenceDelta)}% from last scan
                      </span>
                    </>
                  ) : (
                    <>
                      <Minus className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground font-medium">
                        Consistent with last scan
                      </span>
                    </>
                  )}
                </div>
              )}
              {/* Previous scans list */}
              {baselineHistory.map((h, i) => {
                const isLast = i === baselineHistory.length - 1;
                const color =
                  h.triageResult === 'pass'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : h.triageResult === 'do-not-use'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400';
                const bg =
                  h.triageResult === 'pass'
                    ? 'bg-emerald-500/10'
                    : h.triageResult === 'do-not-use'
                      ? 'bg-red-500/10'
                      : 'bg-amber-500/10';
                const label = h.assessmentOutcome === 'unable-to-assess'
                  ? RESULT_COPY.unableToAssess.label
                  : RESULT_COPY[h.triageResult].label;
                return (
                  <Link
                    key={h.id}
                    href={`/history/${h.id}`}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-muted/40 active:bg-muted transition-colors ${!isLast ? 'border-b' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${bg} ring-1 ${
                        h.triageResult === 'pass' ? 'ring-emerald-400' : h.triageResult === 'do-not-use' ? 'ring-red-400' : 'ring-amber-400'
                      }`} />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(h.createdAt), 'MMM d, yyyy')}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {h.overallConfidence}% confidence
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${bg} ${color}`}>
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Primary Reasons */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Primary Findings</h2>
          <ul className="space-y-3">
            {result.primaryReasons.map((reason, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground bg-secondary/50 p-4 rounded-xl border">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground mt-1.5 shrink-0" />
                <span className="leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* OCR text */}
        {result.ocrText && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Extracted Label Text</h2>
            <div className="bg-muted p-4 rounded-xl font-mono text-xs text-muted-foreground break-words border">
              {result.ocrText}
            </div>
          </section>
        )}

        {/* Category Breakdown */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Detailed Breakdown</h2>
          {isPro ? (
            <div className="space-y-3">
              {result.categories.map((cat) => (
                <CategoryScoreCard key={cat.category} category={cat} />
              ))}
            </div>
          ) : (
            <button
              onClick={() => { rememberUpgradeReturnPath(`/history/${session.id}`); setLocation('/upgrade'); }}
              className="w-full rounded-xl border border-primary/25 bg-primary/5 p-4 text-left"
            >
              <div className="flex gap-3">
                <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">Detailed visual-factor record is a Pro feature</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">Unlock factor explanations, capture limits, PDF screening reports, and repeat-inspection comparisons.</p>
                </div>
              </div>
            </button>
          )}
        </section>
      </div>

      <DisclaimerBanner />
    </div>
  );
}

function MetaRow({
  icon,
  label,
  value,
  border = true,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  border?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={`flex items-center justify-between p-4 ${border ? 'border-b' : ''}`}>
      <div className="flex items-center gap-3 text-muted-foreground">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <span className="font-bold text-foreground text-right max-w-[55%] break-words">{value}</span>
    </div>
  );
}
