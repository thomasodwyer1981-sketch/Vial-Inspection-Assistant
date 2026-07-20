import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { activateProUnlock } from '@/hooks/useProStatus';

/**
 * Landing page after Whop checkout redirects the user back.
 * Reads the membership_id from the URL, verifies it server-side,
 * stores the unlock, and redirects to history.
 *
 * Whop appends ?membership_id=mem_xxx to the redirect URL.
 */
export default function UpgradeCompleteScreen() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const membershipId = params.get('membership_id');

    if (!membershipId || !membershipId.startsWith('mem_')) {
      setStatus('failed');
      return;
    }

    activateProUnlock(membershipId)
      .then((verified) => {
        if (verified) {
          setStatus('success');
          // Give the user a moment to see the success state, then redirect
          setTimeout(() => navigate('/history'), 2000);
        } else {
          setStatus('failed');
        }
      })
      .catch(() => setStatus('failed'));
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
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            If you completed payment, your purchase is saved with Whop — try
            restoring it below. Otherwise, contact support.
          </p>
          <button
            onClick={() => navigate('/upgrade')}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-sm"
          >
            Back to Upgrade
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
