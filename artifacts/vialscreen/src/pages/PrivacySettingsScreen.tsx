import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { getAnalyticsOptOut, setAnalyticsOptOut } from '@/utils/appsflyer';
import { Switch } from '@/components/ui/switch';

export default function PrivacySettingsScreen() {
  const [, setLocation] = useLocation();
  const [optedOut, setOptedOut] = useState(() => getAnalyticsOptOut());

  const handleToggle = (checked: boolean) => {
    // Switch label is "Allow analytics" so checked = NOT opted out
    const newOptOut = !checked;
    setAnalyticsOptOut(newOptOut);
    setOptedOut(newOptOut);
  };

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
        <h1 className="font-bold text-lg">Privacy Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto w-full px-5 py-6 space-y-6">

        {/* Intro */}
        <div className="flex items-start gap-3 bg-muted/60 rounded-xl p-4">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            PepScan stores all scan history on your device only. The control below
            applies to in-app analytics events sent to AppsFlyer, which we use to
            measure advertising performance. Under EU GDPR Article 21, you have the
            right to object to this processing at any time.
          </p>
        </div>

        {/* Analytics toggle */}
        <div className="bg-card border rounded-xl divide-y">
          <div className="px-5 py-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm mb-0.5">In-app analytics</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When enabled, PepScan sends anonymised usage events (scan outcome
                and compound profile) to AppsFlyer to measure advertising
                effectiveness. No images or health data are included. Install
                attribution data (used to attribute your install to an ad campaign)
                is always collected regardless of this setting, as required for
                basic attribution.
              </p>
            </div>
            <Switch
              checked={!optedOut}
              onCheckedChange={handleToggle}
              aria-label="Allow in-app analytics"
              className="shrink-0 mt-0.5"
            />
          </div>

          {optedOut && (
            <div className="px-5 py-3 bg-muted/40">
              <p className="text-xs text-muted-foreground">
                ✓ In-app analytics events are currently disabled. Scan outcomes
                will not be sent to AppsFlyer. Your preference is saved on this
                device.
              </p>
            </div>
          )}
        </div>

        {/* What we never collect */}
        <div className="bg-card border rounded-xl p-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            We never collect
          </p>
          {[
            'Vial images or photographs',
            'Scan results or history',
            'Your name, email, or identity',
            'Location data',
            'Health or medical information',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {item}
            </div>
          ))}
        </div>

        {/* Links */}
        <div className="space-y-2 text-sm">
          <button
            onClick={() => setLocation('/privacy')}
            className="w-full text-left px-5 py-3 bg-card border rounded-xl text-primary font-medium active:bg-muted"
          >
            View full Privacy Policy →
          </button>
          <button
            onClick={() => setLocation('/delete-data')}
            className="w-full text-left px-5 py-3 bg-card border rounded-xl text-muted-foreground font-medium active:bg-muted"
          >
            Delete your data →
          </button>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
