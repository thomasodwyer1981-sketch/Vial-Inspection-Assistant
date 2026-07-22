import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { activateProUnlock } from '@/hooks/useProStatus';
import { getApiBase } from '@/utils/api';

/**
 * Landing page after Whop checkout redirects the user back.
 *
 * Whop may redirect with any of:
 *   ?membership_id=mem_xxx          (ideal — direct activation)
 *   ?receipt_id=pay_xxx&...         (one-time purchase — resolve via API first)
 *   ?payment_id=pay_xxx&...         (alias for receipt_id)
 */

async function resolveReceiptToMembership(receiptId: string): Promise<string | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/whop/resolve-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { membershipId: string | null };
    return data.membershipId ?? null;
  } catch {
    return null;
  }
}

export default function UpgradeCompleteScreen() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');

  useEffect(() => {
    async function activate() {
      const params = new URLSearchParams(window.location.search);

      // Case 1: Whop gave us a membership_id directly
      let membershipId = params.get('membership_id');

      // Case 2: Whop gave us a receipt_id / payment_id — resolve to membership_id
      if (!membershipId || !membershipId.startsWith('mem_')) {
        const receiptId = params.get('receipt_id') ?? params.get('payment_id');
        if (receiptId) {
          membershipId = await resolveReceiptToMembership(receiptId);
        }
      }

      if (!membershipId || !membershipId.startsWith('mem_')) {
        setStatus('failed');
        return;
      }

      try {
        const verified = await activateProUnlock(membershipId);
        if (verified) {
          setStatus('success');
          setTimeout(() => navigate('/history'), 2000);
        } else {
          setStatus('failed');
        }
      } catch {
        setStatus('failed');
      }
    }

    void activate();
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col items-center justify-center px-6 text-center">
      {status === 'verifying' && (
        <>
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <h1 className="text-xl font-bold mb-2">Confirming your purchase…</h1>
          <p className="text-sm text-muted-foreground">Verifying with Whop. This takes a second.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">You're Pro 🎉</h1>
          <p className="text-sm text-muted-foreground mb-1">
            Unlimited history and exports are now unlocked.
          </p>
          <p className="text-xs text-muted-foreground">Taking you to your history…</p>
        </>
      )}

      {status === 'failed' && (
        <>
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-xl font-bold mb-2">Couldn't verify purchase</h1>
          <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
            Your payment was received. To activate Pro, find your membership ID
            in your Whop confirmation email (it starts with <span className="font-mono">mem_</span>),
            then tap Restore below and paste it in.
          </p>
          <a
            href="https://whop.com/purchases"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline underline-offset-2 mb-6"
          >
            View purchases on Whop →
          </a>
          <button
            onClick={() => navigate('/upgrade')}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-sm"
          >
            Restore Purchase
          </button>
          <button
            onClick={() => navigate('/home')}
            className="mt-3 text-sm text-muted-foreground underline underline-offset-2"
          >
            Go home
          </button>
        </>
      )}
    </div>
  );
}
