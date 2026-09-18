import { Lock, Sparkles } from 'lucide-react';

interface ProResearchPanelProps {
  isPro: boolean;
  compoundName?: string | null;
  compoundNote?: string | null;
  profileDescription?: string | null;
  profileAnalysisNote?: string | null;
  meaning?: string | null;
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
              Unlock what this result means, compound-specific research context,
              appearance-profile notes, and the full visual-factor record for this scan.
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