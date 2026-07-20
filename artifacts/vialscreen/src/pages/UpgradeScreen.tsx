import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, CheckCircle2, History, Download, Zap, Shield } from 'lucide-react';
import { FREE_HISTORY_LIMIT, PRO_PRICE_DISPLAY, buildUpgradeCompleteUrl } from '@/utils/pro';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function UpgradeScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const redirectUrl = buildUpgradeCompleteUrl();
      const res = await fetch(`${API_BASE}/api/whop/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUrl }),
      });
      if (!res.ok) throw new Error('Checkout unavailable');
      const { purchaseUrl } = (await res.json()) as { purchaseUrl: string };
      window.location.href = purchaseUrl;
    } catch {
      setError('Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-4 flex items-center gap-4">
        <Link
          href="/home"
          className="p-2 -ml-2 rounded-full hover:bg-muted active:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold">Upgrade to Pro</h1>
      </header>

      <div className="flex-1 px-5 py-6 flex flex-col">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mb-2">PepScan Pro</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            Keep every scan on record and export results — for people who screen seriously.
          </p>
        </div>

        {/* Free vs Pro comparison */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {/* Free column */}
          <div className="bg-muted/50 rounded-2xl p-4 border">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Free</p>
            <ul className="space-y-2.5">
              <FeatureRow ok text="Full analysis on every scan" />
              <FeatureRow ok text="All appearance profiles" />
              <FeatureRow ok text="Differential turbidity engine" />
              <FeatureRow ok={false} text={`Last ${FREE_HISTORY_LIMIT} scans only`} />
              <FeatureRow ok={false} text="Export / share reports" />
            </ul>
          </div>

          {/* Pro column */}
          <div className="bg-primary/5 border border-primary/25 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              Pro
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Pro</p>
            <ul className="space-y-2.5">
              <FeatureRow ok text="Full analysis on every scan" pro />
              <FeatureRow ok text="All appearance profiles" pro />
              <FeatureRow ok text="Differential turbidity engine" pro />
              <FeatureRow ok text="Unlimited scan history" pro />
              <FeatureRow ok text="Export / share reports" pro />
            </ul>
          </div>
        </div>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground mb-8">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> One-time only
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> No subscription
          </span>
          <span className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Unlock forever
          </span>
        </div>

        {/* CTA */}
        <div className="mt-auto space-y-3">
          {error && (
            <p className="text-sm text-destructive text-center bg-destructive/10 rounded-xl py-2 px-4">
              {error}
            </p>
          )}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold text-base py-4 rounded-2xl shadow-lg active:scale-[0.97] transition-transform disabled:opacity-60"
          >
            {loading ? 'Starting checkout…' : `Unlock Pro — ${PRO_PRICE_DISPLAY} one-time`}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Secure checkout powered by Whop. No recurring charges.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  ok,
  text,
  pro = false,
}: {
  ok: boolean;
  text: string;
  pro?: boolean;
}) {
  return (
    <li className="flex items-start gap-2 text-xs leading-snug">
      {ok ? (
        <CheckCircle2
          className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${pro ? 'text-primary' : 'text-muted-foreground'}`}
        />
      ) : (
        <span className="w-3.5 h-3.5 mt-0.5 shrink-0 flex items-center justify-center text-muted-foreground/40 font-bold">—</span>
      )}
      <span className={ok ? (pro ? 'text-foreground font-medium' : 'text-muted-foreground') : 'text-muted-foreground/50 line-through'}>
        {text}
      </span>
    </li>
  );
}
