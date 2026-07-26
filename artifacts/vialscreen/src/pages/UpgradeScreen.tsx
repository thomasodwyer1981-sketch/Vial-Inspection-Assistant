import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, CheckCircle2, History, Download, Zap, Shield, Sparkles, RotateCcw, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { FREE_HISTORY_LIMIT, PRO_PRICE_DISPLAY, buildUpgradeCompleteUrl, consumeUpgradeReturnPath, peekUpgradeReturnPath } from '@/utils/pro';
import { getApiBase } from '@/utils/api';
import { useProStatus, activateProUnlock } from '@/hooks/useProStatus';
import { purchaseRCPro, restoreRCPurchases } from '@/utils/revenuecat';
import { hapticSuccess } from '@/utils/haptics';

const isNative = Capacitor.isNativePlatform();

export default function UpgradeScreen() {
  const [, navigate] = useLocation();
  const { isPro, isLoading: proLoading, recheck } = useProStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post-purchase confirmation (native) — shown briefly before navigating on,
  // mirroring the web flow's UpgradeCompleteScreen.
  const [success, setSuccess] = useState<{ returnPath: string | null; restored: boolean } | null>(null);
  const redirectTimer = useRef<number | null>(null);

  // Cancel any pending post-purchase redirect if the user leaves this screen first
  useEffect(
    () => () => {
      if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
    },
    [],
  );

  const celebrate = (restored: boolean) => {
    void hapticSuccess();
    // Peek (don't consume) so an aborted flow keeps the stored return path;
    // it's consumed exactly once, at the moment we actually navigate.
    setSuccess({ returnPath: peekUpgradeReturnPath(), restored });
    // Refresh entitlement state in the background — never block the redirect on it
    void recheck();
    redirectTimer.current = window.setTimeout(() => {
      navigate(consumeUpgradeReturnPath() ?? '/home');
    }, 2200);
  };

  // Restore flow state (web: membership ID input; native: RC restore button)
  const [showRestore, setShowRestore] = useState(false);
  const [restoreId, setRestoreId] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // ── Native (Google Play) purchase via RevenueCat ──
  const handleNativePurchase = async () => {
    setLoading(true);
    setError(null);
    try {
      const purchased = await purchaseRCPro();
      if (purchased) {
        celebrate(false);
      }
      // If false the user cancelled — just reset loading, no error
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Purchase failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleNativeRestore = async () => {
    setRestoreLoading(true);
    setRestoreError(null);
    try {
      const restored = await restoreRCPurchases();
      if (restored) {
        celebrate(true);
      } else {
        setRestoreError('No previous purchase found for this Google account.');
      }
    } catch {
      setRestoreError('Restore failed. Please try again.');
    } finally {
      setRestoreLoading(false);
    }
  };

  // ── Web (Whop) purchase ──
  const handleWebPurchase = async () => {
    setLoading(true);
    setError(null);
    try {
      const redirectUrl = buildUpgradeCompleteUrl();
      const res = await fetch(`${getApiBase()}/api/whop/checkout`, {
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

  const handleWebRestore = async () => {
    const id = restoreId.trim();
    if (!id) {
      setRestoreError('Please paste your membership ID.');
      return;
    }
    if (!id.startsWith('mem_')) {
      setRestoreError('Membership IDs start with mem_ — check your Whop account.');
      return;
    }
    setRestoreLoading(true);
    setRestoreError(null);
    try {
      const verified = await activateProUnlock(id);
      if (verified) {
        await recheck();
        navigate(consumeUpgradeReturnPath() ?? '/history');
      } else {
        setRestoreError('That membership ID could not be verified. Make sure it matches your Whop account for PepScan Pro.');
      }
    } catch {
      setRestoreError('Verification failed. Please try again.');
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 pb-4 pt-safe-4 flex items-center gap-4">
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
              <FeatureRow ok text="Basic visual analysis" />
              <FeatureRow ok text="2 of 4 compound profiles" />
              <FeatureRow ok text="Image & text sharing" />
              <FeatureRow ok={false} text="AI Vision analysis" />
              <FeatureRow ok={false} text={`Last ${FREE_HISTORY_LIMIT} scans only`} />
              <FeatureRow ok={false} text="PDF report export" />
            </ul>
          </div>

          {/* Pro column */}
          <div className="bg-primary/5 border border-primary/25 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              Pro
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Pro</p>
            <ul className="space-y-2.5">
              <FeatureRow ok text="Full AI Vision analysis" pro />
              <FeatureRow ok text="All 4 compound profiles" pro />
              <FeatureRow ok text="Unlimited scan history" pro />
              <FeatureRow ok text="PDF report export" pro />
              <FeatureRow ok text="Powder vial scanning" pro />
            </ul>
          </div>
        </div>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground mb-8">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Cancel anytime
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Billed annually
          </span>
          <span className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Renews each year
          </span>
        </div>

        {/* CTA */}
        <div className="mt-auto space-y-3">
          {success ? (
            <div className="rounded-2xl bg-primary/10 border border-primary/25 p-5 text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <p className="font-bold text-lg mb-1">
                {success.restored ? 'Purchase restored!' : 'Pro activated!'}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI Vision, all compound profiles, unlimited history, PDF export, and powder scanning are now unlocked.
              </p>
              <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                {success.returnPath === '/scan' ? 'Returning to your scan…' : 'Taking you home…'}
              </p>
            </div>
          ) : isPro ? (
            <div className="rounded-2xl bg-primary/10 border border-primary/25 p-5 text-center">
              <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <p className="font-bold text-base mb-1">You're already on Pro</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unlimited history, PDF export, and powder scanning are all active on your account.
              </p>
              <Link
                href="/home"
                className="mt-4 inline-block text-sm font-bold text-primary hover:underline"
              >
                Back to Home →
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <p className="text-sm text-destructive text-center bg-destructive/10 rounded-xl py-2 px-4">
                  {error}
                </p>
              )}

              {/* Purchase button */}
              <button
                onClick={isNative ? handleNativePurchase : handleWebPurchase}
                disabled={loading || proLoading}
                className="w-full bg-primary text-primary-foreground font-bold text-base py-4 rounded-2xl shadow-lg active:scale-[0.97] transition-transform disabled:opacity-60"
              >
                {loading ? 'Processing…' : `Unlock Pro — ${PRO_PRICE_DISPLAY}`}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                {isNative
                  ? 'Secure payment via Google Play. Billed annually. Cancel anytime.'
                  : 'Secure checkout powered by Whop. Billed annually. Cancel anytime.'}
              </p>

              {/* Restore purchase */}
              <div className="pt-2 border-t">
                {isNative ? (
                  // Native: single restore button via RevenueCat
                  <div className="space-y-2">
                    <button
                      onClick={handleNativeRestore}
                      disabled={restoreLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
                    >
                      {restoreLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Restoring…</>
                      ) : (
                        <><RotateCcw className="w-4 h-4" /> Restore previous purchase</>
                      )}
                    </button>
                    {restoreError && (
                      <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-center">
                        {restoreError}
                      </p>
                    )}
                  </div>
                ) : (
                  // Web: Whop membership ID restore
                  !showRestore ? (
                    <button
                      onClick={() => setShowRestore(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Already purchased? Restore access
                    </button>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <div>
                        <p className="text-sm font-semibold mb-1">Restore your purchase</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          Find your membership ID at{' '}
                          <a
                            href="https://whop.com/purchases"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-2"
                          >
                            whop.com/purchases
                          </a>{' '}
                          — tap your PepScan Pro order and copy the ID starting with <span className="font-mono">mem_</span>
                        </p>
                        <input
                          type="text"
                          value={restoreId}
                          onChange={(e) => setRestoreId(e.target.value)}
                          placeholder="mem_xxxxxxxxxxxxxxxx"
                          className="w-full border rounded-xl px-4 py-3 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                        />
                      </div>
                      {restoreError && (
                        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                          {restoreError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowRestore(false); setRestoreId(''); setRestoreError(null); }}
                          className="flex-1 py-3 rounded-xl border text-sm font-medium text-muted-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleWebRestore}
                          disabled={restoreLoading}
                          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {restoreLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                          ) : (
                            'Activate Pro'
                          )}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}
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
