import { useState } from 'react';
import { useLocation } from 'wouter';
import { setOnboardingComplete } from '@/utils/storage';
import { PRIMARY_DISCLAIMER, ONBOARDING } from '@/constants/copy';
import { Checkbox } from '@/components/ui/checkbox';

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
    <div className="min-h-[100dvh] flex flex-col bg-background max-w-md mx-auto relative shadow-2xl overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-10 pb-32">
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
          {ONBOARDING.title}
        </h1>
        <p className="text-muted-foreground mb-8">{ONBOARDING.subtitle}</p>

        <div className="bg-card border rounded-xl p-5 mb-8 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
            {PRIMARY_DISCLAIMER}
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">
              {ONBOARDING.whatItDoes.heading}
            </h2>
            <ul className="space-y-2">
              {ONBOARDING.whatItDoes.points.map((pt, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">
              {ONBOARDING.whatItDoesNot.heading}
            </h2>
            <ul className="space-y-2">
              {ONBOARDING.whatItDoesNot.points.map((pt, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">
              {ONBOARDING.hardCases.heading}
            </h2>
            <ul className="space-y-2">
              {ONBOARDING.hardCases.points.map((pt, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t p-5 pt-4">
        <label className="flex items-start gap-3 cursor-pointer mb-4">
          <Checkbox 
            checked={acknowledged} 
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
            className="mt-0.5"
          />
          <span className="text-sm font-medium leading-tight">
            {ONBOARDING.acknowledge}
          </span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={!acknowledged}
          className="w-full bg-primary text-primary-foreground py-3.5 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm active:scale-[0.98]"
        >
          Begin Screening
        </button>
      </div>
    </div>
  );
}
