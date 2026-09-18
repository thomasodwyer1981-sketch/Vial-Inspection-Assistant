import { Lock, Sparkles } from 'lucide-react';
import type { ConfidenceFactor, LabelIntelligence } from '../types';

interface ProResearchPanelProps {
  isPro: boolean;
  compoundName?: string | null;
  compoundNote?: string | null;
  profileDescription?: string | null;
  profileAnalysisNote?: string | null;
  meaning?: string | null;
  labelIntelligence?: LabelIntelligence;
  confidenceFactors?: ConfidenceFactor[];
  rescanTips?: string[];
  onUnlock: () => void;
}

/**
 * The scan result stays useful without a purchase, while interpretation and
 * compound/profile context remain consistently behind the same Pro gate on
 * live results and saved detail pages.
 */
export default function ProResearchPanel({
  isPro,
  compoundName,
  compoundNote,
  profileDescription,
  profileAnalysisNote,
  meaning,
  labelIntelligence,
  confidenceFactors,
  rescanTips,
  onUnlock,
}: ProResearchPanelProps) {
  if (!isPro) {
    return (
      <section className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground">Full compound &amp; research detail</h2>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Unlock lot/expiry readout, mismatch checks, and why this score looks
              the way it does — one-time. You also get the full research context
              and visual-factor record for this scan.
            </p>
            <button
              onClick={onUnlock}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 active:scale-[0.98]"
            >
              Unlock Pro — one-time
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
          Full compound &amp; research detail
        </h2>
      </div>

      <div className="space-y-4">
        {compoundName && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Scan-specific context
            </p>
            <p className="text-sm font-semibold text-foreground">{compoundName}</p>
          </div>
        )}

        {meaning && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              What this means
            </p>
            <p className="text-sm text-foreground leading-relaxed">{meaning}</p>
          </div>
        )}

        {compoundNote && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Compound research note
            </p>
            <p className="text-sm text-foreground leading-relaxed">{compoundNote}</p>
          </div>
        )}

        {profileDescription && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Related appearance context
            </p>
            <p className="text-sm text-foreground leading-relaxed">{profileDescription}</p>
          </div>
        )}

        {profileAnalysisNote && (
          <div className="rounded-xl border border-primary/15 bg-background/55 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">How PepScan screened it: </span>
              {profileAnalysisNote}
            </p>
          </div>
        )}

        <section className="rounded-xl border border-border/70 bg-background/55 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
            Label intelligence
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <LabelField label="Lot / batch" value={labelIntelligence?.lotBatch} />
            <LabelField label="Expiry / best-before" value={labelIntelligence?.expiry} />
            <LabelField label="Manufacturer / brand" value={labelIntelligence?.manufacturerBrand} />
            <LabelField label="Volume / concentration" value={labelIntelligence?.volumeConcentration} />
          </div>
          {labelIntelligence?.mismatch && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                Label mismatch — research check
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Entered name: <span className="font-semibold text-foreground">{labelIntelligence.mismatch.expectedName}</span>
                {' · '}
                Printed name: <span className="font-semibold text-foreground">{labelIntelligence.mismatch.printedName}</span>
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
                This is an educational label comparison, not a confirmation of identity.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border/70 bg-background/55 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
            Why this confidence score
          </h3>
          {confidenceFactors?.length ? (
            <div className="space-y-2.5">
              {confidenceFactors.map((factor) => (
                <div key={factor.key} className="rounded-xl border border-border/60 bg-card/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-foreground">{factor.label}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${factorStatusClass(factor.status)}`}>
                      {factor.status} · {factor.score}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{factor.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              This older saved scan does not contain the structured confidence signals.
              Its original overall confidence remains available above.
            </p>
          )}

          {rescanTips?.length ? (
            <div className="mt-4 border-t border-border/60 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Rescan tips
              </p>
              <ul className="space-y-1.5">
                {rescanTips.map((tip) => (
                  <li key={tip} className="text-xs text-foreground leading-relaxed pl-3 relative before:absolute before:left-0 before:top-[0.45rem] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ) : confidenceFactors?.length ? (
            <p className="mt-4 border-t border-border/60 pt-3 text-xs text-primary leading-relaxed">
              Clean read — the available label and capture signals are all strong.
            </p>
          ) : null}
        </section>

        {!compoundNote && !profileDescription && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            No compound-specific research note is available for this scan. The
            detailed visual-factor record below contains the evidence captured by PepScan.
          </p>
        )}

        <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border/60 pt-3">
          This research context is educational only. Visual screening cannot confirm
          identity, purity, potency, sterility, or safety.
        </p>
      </div>
    </section>
  );
}

function LabelField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 break-words text-xs leading-relaxed ${value ? 'text-foreground' : 'text-muted-foreground italic'}`}>
        {value || 'Not found on label'}
      </p>
    </div>
  );
}

function factorStatusClass(status: ConfidenceFactor['status']): string {
  if (status === 'good') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
  if (status === 'fair') return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
  return 'bg-destructive/10 text-destructive';
}