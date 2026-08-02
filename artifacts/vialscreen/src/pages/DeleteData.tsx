import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function DeleteData() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3 z-10">
        <button
          onClick={() => { if (window.history.length > 1) window.history.back(); else setLocation('/home'); }}
          className="p-2 -ml-2 rounded-full hover:bg-muted active:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Delete Your Data</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 text-sm text-foreground leading-relaxed space-y-6">

        <p className="text-muted-foreground">
          PepScan stores all scan history and settings locally on your device. No
          personal account is created and no scan images are uploaded to our servers.
        </p>

        {/* Delete all */}
        <section>
          <h2 className="text-base font-bold mb-2">Delete all data instantly</h2>
          <p className="text-muted-foreground mb-3">
            To delete all data associated with PepScan, simply uninstall the app
            from your device. This permanently removes all scan history, settings,
            and cached data.
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Long-press the PepScan icon on your home screen or app drawer</li>
            <li>Tap <strong>Uninstall</strong> (or drag to the Uninstall area)</li>
            <li>Confirm — all local data is deleted immediately</li>
          </ol>
        </section>

        {/* Clear without uninstalling */}
        <section>
          <h2 className="text-base font-bold mb-2">Clear data without uninstalling</h2>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Open your device <strong>Settings</strong></li>
            <li>Go to <strong>Apps</strong> → <strong>PepScan</strong></li>
            <li>Tap <strong>Storage</strong> → <strong>Clear data</strong></li>
          </ol>
        </section>

        {/* Analytics opt-out */}
        <section className="bg-card border rounded-xl p-5">
          <h2 className="text-base font-bold mb-2">Opt out of analytics</h2>
          <p className="text-muted-foreground mb-3">
            PepScan sends anonymised scan events to AppsFlyer under legitimate interests
            (GDPR Article 6(1)(f)). You can object to this processing at any time using
            the in-app Privacy Settings.
          </p>
          <button
            onClick={() => setLocation('/privacy-settings')}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all"
          >
            Open Privacy Settings
          </button>
        </section>

        {/* Third-party */}
        <section>
          <h2 className="text-base font-bold mb-2">Third-party data</h2>
          <p className="text-muted-foreground mb-3">
            Anonymised crash reports sent to Sentry are automatically deleted after
            90 days. No personally identifiable information is included in these reports.
          </p>
          <p className="text-muted-foreground mb-3">
            Attribution and analytics data held by AppsFlyer is retained for up to
            24 months per their data retention policy. To request deletion of your
            AppsFlyer data, contact us at{' '}
            <a href="mailto:pepscan@peptilog.ie" className="text-primary underline underline-offset-2">
              pepscan@peptilog.ie
            </a>{' '}
            and we will submit a deletion request on your behalf.
          </p>
          <p className="text-muted-foreground">
            Purchase records are held by Google Play and governed by Google's own
            privacy and data deletion policies.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-base font-bold mb-2">Contact us</h2>
          <p className="text-muted-foreground">
            For any data rights request, contact{' '}
            <a href="mailto:pepscan@peptilog.ie" className="text-primary underline underline-offset-2">
              pepscan@peptilog.ie
            </a>
            . We will respond within 30 days.
          </p>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
}
