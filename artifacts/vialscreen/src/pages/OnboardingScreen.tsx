import { useState } from 'react';
import { useLocation } from 'wouter';
import { setOnboardingComplete } from '@/utils/storage';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'wouter';

const DOES: string[] = [
  'Guides a standardised two-background visual inspection',
  'Screens for visible particles, haze, fill anomalies & label readability',
  'Returns a structured triage: Pass, Review, or Do Not Use',
];

const DOES_NOT: string[] = [
  'Confirm compound identity, authenticity, purity, potency, or sterility',
  'Detect endotoxins, pathogens, or invisible contamination',
  'Guarantee a vial is safe or fit for any use',
  'Replace laboratory analysis or professional testing',
  'Support any decision to administer any substance to yourself or others',
];

const HARD_CASES: string[] = [
  'Amber / dark glass vials',
  'Coloured or opaque liquids',
  'Powder / lyophilised vials',
  'Heavy foil or printed labels',
  'Poor lighting or heavy glare',
];

export default function OnboardingScreen() {
  const [, setLocation] = useLocation();
  const [acknowledged, setAcknowledged] = useState(false);

  const handleSubmit = () => {
    if (acknowledged) {
      setOnboardingComplete();
      setLocation('/home');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background max-w-md mx-auto overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 pt-10 pb-36">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground leading-tight">
            Before You Begin
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            PepScan is a <span className="font-semibold text-foreground">visual screening tool only</span> — not a lab test.
          </p>
        </div>

        {/* What it does */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2.5">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What it does</h2>
          </div>
          <ul className="space-y-1.5 pl-6">
            {DOES.map((pt, i) => (
              <li key={i} className="text-sm text-foreground leading-snug">{pt}</li>
            ))}
          </ul>
        </div>

        {/* What it does NOT do */}
        <div className="mb-5 bg-destructive/5 border border-destructive/15 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <XCircle className="w-4 h-4 text-destructive shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-destructive/80">Does NOT</h2>
          </div>
          <ul className="space-y-1.5 pl-6">
            {DOES_NOT.map((pt, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-snug">{pt}</li>
            ))}
          </ul>
        </div>

        {/* Difficult cases */}
        <div className="bg-warning/5 border border-warning/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-warning/80">Lower confidence on</h2>
          </div>
          <div className="flex flex-wrap gap-2 pl-6">
            {HARD_CASES.map((pt, i) => (
              <span key={i} className="text-xs text-muted-foreground bg-muted border rounded-full px-2.5 py-1 leading-tight">
                {pt}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t px-5 py-4 space-y-3 max-w-md mx-auto">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
            className="mt-0.5 shrink-0"
          />
          <span className="text-sm text-muted-foreground leading-snug">
            I confirm I am 18 or over. I understand PepScan is a visual screening tool only, is NOT intended for human use, and does not confirm safety, purity, sterility, or identity. A Pass result is not a safety clearance. PepScan does not provide medical, laboratory, or safety advice and must not be used in any clinical or emergency situation. I use this app entirely at my own risk and will not rely on it to make any decision about administering any substance.
          </span>
        </label>
        {/* T&C links kept outside the label so tapping them never toggles the checkbox */}
        <p className="text-xs text-muted-foreground pl-7 -mt-1">
          By continuing you agree to the{' '}
          <Link href="/terms" className="text-primary underline underline-offset-2">Terms of Use</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-primary underline underline-offset-2">Privacy Policy</Link>.
        </p>

        <button
          onClick={handleSubmit}
          disabled={!acknowledged}
          className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          Begin Screening
        </button>
      </div>
    </div>
  );
}
