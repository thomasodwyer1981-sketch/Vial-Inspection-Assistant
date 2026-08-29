import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, CheckCircle2, History, Download, Zap, Sparkles, RotateCcw, Loader2, Layers, FileSearch, GitCompareArrows } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { buildUpgradeCompleteUrl, consumeUpgradeReturnPath, peekUpgradeReturnPath } from '@/utils/pro';
import { getApiBase } from '@/utils/api';
import { useProStatus, activateProUnlock } from '@/hooks/useProStatus';
import { purchaseRCPro, restoreRCPurchases } from '@/utils/revenuecat';
import { hapticSuccess } from '@/utils/haptics';
import { logAFEvent } from '@/utils/appsflyer';
import { useProPrice } from '@/hooks/useProPrice';

const isNative = Capacitor.isNativePlatform();
const isIOS = Capacitor.getPlatform() === 'ios';

export default function UpgradeScreen() {
  const [, navigate] = useLocation();
  const { isPro, isLoading: proLoading, recheck } = useProStatus();
  const proPrice = useProPrice();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<{ returnPath: string | null; restored: boolean } | null>(null);
  const redirectTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
    },
    [],
  );

  const celebrate = (restored: boolean) => {
    void hapticSuccess();
    setSuccess({ returnPath: peekUpgradeReturnPath(), restored });
    void recheck();
    redirectTimer.current = window.setTimeout(() => {
      navigate(consumeUpgradeReturnPath() ?? '/home');
    }, 2200);
  };

  const [showRestore, setShowRestore] = useState(false);
  const [restoreId, setRestoreId] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // ── Native (App Store / Google Play) purchase via RevenueCat ──
  const handleNativePurchase = async () => {
    setLoading(true);
    setError(null);
    try {
      const purchased = await purchaseRCPro();
      if (purchased) {
        void logAFEvent('purchase_complete', { plan: 'pro', revenue: 4.99 });
        celebrate(false);
      }
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
        setRestoreError(
          isIOS
            ? 'No previous purchase found for this Apple ID.'
            : 'No previous purchase found for this Google account.',
        );
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
    if (!id) { setRestoreError('Please paste your membership ID.'); return; }
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
        setRestoreError(
          'That membership ID could not be verified. Make sure it matches your Whop account for PepScan Pro.',
        );
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

      <div className="flex-1 overflow-y-auto">
        {/* ── Success state ── */}
        {success ? (
          <div className="flex items-center justify-center px-5 py-16 min-h-[60vh]">
            <div className="rounded-2xl bg-primary/10 border border-primary/25 p-6 text-center w-full max-w-sm">
              <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-primary-foreground" />
              </div>
              <p className="font-bold text-xl mb-2">
                {success.restored ? 'Purchase restored!' : 'Pro activated!'}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Detailed visual records, all appearance profiles, powder screening, expanded on-device history, and PDF reports are now unlocked.
              </p>
              <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                {success.returnPath === '/scan' ? 'Returning to your scan…' : 'Taking you home…'}
              </p>
            </div>
          </div>

        ) : isPro ? (
          /* ── Already Pro ── */
          <div className="flex items-center justify-center px-5 py-16 min-h-[60vh]">
            <div className="rounded-2xl bg-primary/10 border border-primary/25 p-6 text-center w-full max-w-sm">
              <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="font-bold text-lg mb-2">You're already on Pro</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Expanded on-device history, PDF reports, repeat-inspection comparisons, and powder screening are active. Records remain on this device and depend on available storage.
              </p>
              <Link
                href="/home"
                className="mt-5 inline-block text-sm font-bold text-primary hover:underline"
              >
                Back to Home →
              </Link>
            </div>
          </div>

        ) : (
          /* ── Paywall ── */
          <div className="px-5 py-6 space-y-5 pb-safe-4">

            {/* Hero */}
            <div className="bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/20 rounded-2xl p-6 text-center">
              <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight mb-2 leading-tight">
                Build a better<br />inspection record.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                PepScan Pro turns a visual screen into a deeper, exportable record: what was observed,
                which capture limits applied, and how a repeat inspection changed.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <BenefitRow
                icon={<FileSearch className="w-4 h-4 text-primary" />}
                title="Detailed visual-factor explanations"
                desc="See the recorded factors, observed findings, and capture-quality limits behind each visual outcome — not just a single result label."
              />
              <BenefitRow
                icon={<History className="w-4 h-4 text-primary" />}
                title="Expanded on-device history"
                desc="Free shows your 3 newest saved scans. Pro can view up to 100 locally stored records, subject to device storage, with local backup export."
              />
              <BenefitRow
                icon={<Download className="w-4 h-4 text-primary" />}
                title="PDF screening reports"
                desc="Export the outcome, visual factors, capture limitations, timestamp, vial details, notes, and the visual-screening disclaimer."
              />
              <BenefitRow
                icon={<GitCompareArrows className="w-4 h-4 text-primary" />}
                title="Repeat-inspection comparison"
                desc="Compare a saved repeat scan with an earlier record of the same sample and make changed visible findings clear."
              />
              <BenefitRow
                icon={<Layers className="w-4 h-4 text-primary" />}
                title="All appearance profiles and powder screening"
                desc="Use the full set of expected-appearance profiles and pre-mix powder visual screening. Profiles do not verify a compound’s identity."
              />
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-2.5 bg-muted/60 rounded-xl py-3.5 px-4 text-xs text-muted-foreground">
              <span className="text-sm" aria-hidden>⭐️⭐️⭐️⭐️⭐️</span>
              <span>Trusted by researchers in 40+ countries</span>
            </div>

            {/* CTA block */}
            <div className="space-y-3">
              {error && (
                <p className="text-sm text-destructive text-center bg-destructive/10 rounded-xl py-2 px-4">
                  {error}
                </p>
              )}

              {isNative ? (
                <>
                  <button
                    onClick={handleNativePurchase}
                    disabled={loading || proLoading}
                    className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-br from-primary to-primary/85 text-primary-foreground font-bold text-base py-4 rounded-2xl shadow-lg shadow-primary/25 active:scale-[0.97] transition-all disabled:opacity-60"
                  >
                    <Zap className="w-5 h-5" />
                    {loading ? 'Processing…' : `Unlock Pro — ${proPrice} / year`}
                  </button>
                  <p className="text-center text-xs text-muted-foreground leading-relaxed">
                    PepScan Pro — {proPrice}, billed annually. Renews automatically each year unless
                    cancelled at least 24 hours before the renewal date.{' '}
                    {isIOS
                      ? 'Manage or cancel in your Apple ID subscription settings.'
                      : 'Manage or cancel in Google Play.'}
                  </p>
                  <p className="text-center text-xs text-muted-foreground/70">
                    Payment via {isIOS ? 'Apple App Store' : 'Google Play'}. By purchasing you agree to our{' '}
                    <Link href="/terms" className="underline underline-offset-2">Terms of Use</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
                  </p>
                </>
              ) : (
                <div className="rounded-2xl border bg-muted/40 p-5 text-center space-y-3">
                  <p className="font-semibold text-sm">Available on Android</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    PepScan Pro is purchased through the Android app via Google Play.
                    Download the app to upgrade.
                  </p>
                  <p className="text-center text-xs text-muted-foreground/70">
                    By purchasing you agree to our{' '}
                    <Link href="/terms" className="underline underline-offset-2">Terms of Use</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
                  </p>
                </div>
              )}

              {/* Restore purchase */}
              <div className="pt-2 border-t">
                {isNative ? (
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
                ) : !showRestore ? (
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
                        — tap your PepScan Pro order and copy the ID starting with{' '}
                        <span className="font-mono">mem_</span>
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
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Benefit row ────────────────────────────────────────────────────────────────

function BenefitRow({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 bg-card border rounded-xl p-4 shadow-sm">
      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight mb-0.5">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
