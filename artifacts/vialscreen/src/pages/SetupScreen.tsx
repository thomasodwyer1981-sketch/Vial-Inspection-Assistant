import { Link } from 'wouter';
import { ArrowLeft, CheckCircle2, Info } from 'lucide-react';
import { PREPARATION } from '@/constants/copy';
import DisclaimerBanner from '@/components/DisclaimerBanner';

export default function SetupScreen() {
  return (
    <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col relative pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-4 flex items-center gap-4">
        <Link href="/home" className="p-2 -ml-2 rounded-full hover:bg-muted active:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold">Setup Guide</h1>
      </header>

      <div className="p-6 space-y-8 flex-1">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
            <h2 className="text-lg font-semibold">{PREPARATION.materials.heading}</h2>
          </div>
          <div className="space-y-3 pl-10">
            {PREPARATION.materials.items.map((item, i) => (
              <div key={i} className="bg-card border rounded-lg p-3 shadow-sm">
                <h3 className="font-semibold text-sm mb-1">{item.label}</h3>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
            <h2 className="text-lg font-semibold">{PREPARATION.steps.heading}</h2>
          </div>
          <div className="space-y-3 pl-10">
            {PREPARATION.steps.items.map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
            <h2 className="text-lg font-semibold">{PREPARATION.lightingTips.heading}</h2>
          </div>
          <div className="space-y-3 pl-10">
            {PREPARATION.lightingTips.items.map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <DisclaimerBanner />

      <div className="sticky bottom-0 bg-background border-t p-4 flex gap-3">
        <Link href="/scan" className="flex-1 bg-primary text-primary-foreground py-3.5 px-4 rounded-lg font-semibold text-center shadow-sm active:scale-[0.98] transition-transform">
          Start Scan Now
        </Link>
      </div>
    </div>
  );
}
