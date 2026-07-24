import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, FlaskConical, Syringe, Droplets, Hash } from 'lucide-react';

/**
 * Reconstitution calculator — free utility.
 *
 * Given peptide amount (mg), BAC water volume (mL), and desired dose (mcg),
 * shows the resulting concentration, the draw on a U-100 insulin syringe,
 * and how many doses the vial holds. All math happens locally.
 */

function parsePositive(raw: string): number | null {
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Trim trailing zeros: 250.00 → "250", 12.50 → "12.5" */
function fmt(n: number, dp = 2): string {
  return Number(n.toFixed(dp)).toString();
}

export default function CalculatorScreen() {
  const [mgRaw, setMgRaw] = useState('');
  const [mlRaw, setMlRaw] = useState('');
  const [doseRaw, setDoseRaw] = useState('');

  const mg = parsePositive(mgRaw);
  const ml = parsePositive(mlRaw);
  const doseMcg = parsePositive(doseRaw);

  // Derived values — concentration needs mg + mL; dose figures also need dose
  const concentrationMcgPerMl = mg && ml ? (mg * 1000) / ml : null;
  const drawMl = concentrationMcgPerMl && doseMcg ? doseMcg / concentrationMcgPerMl : null;
  const units = drawMl !== null ? drawMl * 100 : null; // U-100: 100 units = 1 mL
  const dosesPerVial = mg && doseMcg ? (mg * 1000) / doseMcg : null;

  const overSyringe = units !== null && units > 100;

  return (
    <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 pb-4 pt-safe-4 flex items-center gap-4">
        <Link
          href="/home"
          className="p-2 -ml-2 rounded-full hover:bg-muted active:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold">Reconstitution Calculator</h1>
      </header>

      <div className="flex-1 px-5 py-6 space-y-6">
        {/* Inputs */}
        <div className="space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">
              Peptide in vial (mg)
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 5"
              className="w-full bg-card border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={mgRaw}
              onChange={(e) => setMgRaw(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">
              Bacteriostatic water added (mL)
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 2"
              className="w-full bg-card border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={mlRaw}
              onChange={(e) => setMlRaw(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">
              Desired dose (mcg)
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 250"
              className="w-full bg-card border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={doseRaw}
              onChange={(e) => setDoseRaw(e.target.value)}
            />
          </label>
        </div>

        {/* Results */}
        <div className="space-y-3">
          <ResultCard
            icon={<Droplets className="w-5 h-5 text-primary" />}
            label="Concentration"
            value={concentrationMcgPerMl !== null ? `${fmt(concentrationMcgPerMl, 0)} mcg/mL` : '—'}
            hint={concentrationMcgPerMl !== null ? `${fmt(concentrationMcgPerMl / 1000)} mg/mL` : 'Enter vial mg and water mL'}
          />
          <ResultCard
            icon={<Syringe className="w-5 h-5 text-primary" />}
            label="Draw on U-100 insulin syringe"
            value={units !== null ? `${fmt(units, 1)} units` : '—'}
            hint={
              units === null
                ? 'Enter a desired dose'
                : overSyringe
                  ? 'More than a full 1 mL syringe — consider using less water when reconstituting'
                  : `${fmt(drawMl!, 3)} mL per dose`
            }
            warn={overSyringe}
          />
          <ResultCard
            icon={<Hash className="w-5 h-5 text-primary" />}
            label="Doses per vial"
            value={dosesPerVial !== null ? fmt(dosesPerVial, 1) : '—'}
            hint={dosesPerVial !== null ? `at ${fmt(doseMcg!, 0)} mcg each` : 'Enter vial mg and dose'}
          />
        </div>

        {/* Explainer */}
        <div className="bg-card border rounded-2xl p-4 flex gap-3">
          <FlaskConical className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            U-100 syringes hold 100 units = 1 mL. Example: 5 mg reconstituted with
            2 mL gives 2,500 mcg/mL, so a 250 mcg dose is a 10-unit draw.
            Double-check your own math before dosing — this tool does not verify
            what is actually in the vial.
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  icon,
  label,
  value,
  hint,
  warn = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-4 ${warn ? 'bg-warning/10 border-warning/30' : 'bg-card'}`}>
      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-extrabold tracking-tight text-foreground mt-0.5">{value}</p>
        <p className={`text-xs mt-0.5 leading-snug ${warn ? 'text-warning font-medium' : 'text-muted-foreground'}`}>{hint}</p>
      </div>
    </div>
  );
}
