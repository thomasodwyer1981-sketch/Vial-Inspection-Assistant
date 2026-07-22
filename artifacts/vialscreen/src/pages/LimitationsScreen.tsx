import { Link } from 'wouter';
import { ArrowLeft, ShieldAlert, Palette } from 'lucide-react';
import { LIMITATIONS_COPY, PRIMARY_DISCLAIMER } from '@/constants/copy';

export default function LimitationsScreen() {
  return (
    <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col relative pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 pb-4 pt-safe-4 flex items-center gap-4">
        <Link href="/home" className="p-2 -ml-2 rounded-full hover:bg-muted active:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold">Limitations & Disclaimers</h1>
      </header>

      <div className="p-6 space-y-8 flex-1">
        <div className="bg-destructive/10 border-destructive/30 border rounded-xl p-5 text-sm text-destructive-foreground">
          <div className="flex gap-3 mb-3">
            <ShieldAlert className="w-6 h-6 text-destructive shrink-0" />
            <h2 className="font-bold text-base leading-tight">Important Regulatory Disclaimer</h2>
          </div>
          <p className="leading-relaxed whitespace-pre-wrap font-medium">
            {PRIMARY_DISCLAIMER}
          </p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {LIMITATIONS_COPY.intro}
        </p>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
            {LIMITATIONS_COPY.cannotTest.heading}
          </h2>
          <div className="bg-card border rounded-xl divide-y">
            {LIMITATIONS_COPY.cannotTest.items.map((item, i) => (
              <div key={i} className="p-4">
                <h3 className="font-bold text-sm mb-1">{item.label}</h3>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
            {LIMITATIONS_COPY.difficultCases.heading}
          </h2>
          <ul className="bg-card border rounded-xl p-5 space-y-3">
            {LIMITATIONS_COPY.difficultCases.items.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-warning mt-2 shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Appearance Profiles section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {LIMITATIONS_COPY.appearanceProfiles.heading}
            </h2>
          </div>
          <ul className="bg-card border rounded-xl p-5 space-y-3">
            {LIMITATIONS_COPY.appearanceProfiles.items.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-secondary/50 border rounded-xl p-5">
          <h2 className="text-sm font-bold mb-2">
            {LIMITATIONS_COPY.passNote.heading}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {LIMITATIONS_COPY.passNote.detail}
          </p>

          <h2 className="text-sm font-bold mb-2">
            {LIMITATIONS_COPY.recommendation.heading}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {LIMITATIONS_COPY.recommendation.detail}
          </p>
        </section>
      </div>
    </div>
  );
}
