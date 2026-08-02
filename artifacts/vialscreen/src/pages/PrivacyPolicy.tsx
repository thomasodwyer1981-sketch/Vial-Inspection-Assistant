import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
        <h1 className="font-bold text-lg">Privacy Policy</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 text-sm text-foreground leading-relaxed space-y-7">
        <p className="text-xs text-muted-foreground">Last updated: 31 July 2026</p>

        {/* ── Controller ── */}
        <section className="bg-muted/60 rounded-xl p-4 text-xs text-muted-foreground">
          <p>
            <strong>Data Controller:</strong> Peptilog Ltd, Gorey, Co. Wexford, Ireland.{' '}
            Contact: <a href="mailto:pepscan@peptilog.ie" className="text-primary underline underline-offset-2">pepscan@peptilog.ie</a>
          </p>
        </section>

        {/* ── Intro ── */}
        <section>
          <p>
            PepScan ("we", "our", or "us") is a mobile application operated by Peptilog Ltd for
            visual screening of peptide and research compound vials. This Privacy Policy explains
            what personal data we collect, why we collect it, who we share it with, and your rights
            under EU GDPR and other applicable data protection laws.
          </p>
          <p className="mt-3 font-semibold">
            PepScan is intended for adults aged 18 and over. We do not knowingly collect personal
            data from anyone under 18. If you believe a minor has used the App, contact us immediately
            and we will delete any associated data.
          </p>
        </section>

        {/* ── 1. Data we collect ── */}
        <section>
          <h2 className="text-base font-bold mb-3">1. Personal Data We Collect</h2>

          {/* 1a. Support / contact */}
          <div className="mb-4">
            <h3 className="font-semibold mb-1">1a. Support and Contact Data</h3>
            <p className="text-muted-foreground mb-1">
              If you contact us by email, we collect your email address and the content of your
              message (including any attachments you choose to send). This data is used solely to
              respond to your enquiry.
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Lawful basis:</strong> Legitimate interests (responding to support requests).
              <br /><strong>Retention:</strong> Deleted when the support matter is resolved, or upon
              request — typically no longer than 12 months.
            </p>
          </div>

          {/* 1b. Subscription */}
          <div className="mb-4">
            <h3 className="font-semibold mb-1">1b. Subscription and Purchase Data</h3>
            <p className="text-muted-foreground mb-1">
              If you subscribe to PepScan Pro, your purchase is processed by Google Play (Google LLC).
              We use RevenueCat, Inc. as our subscription management platform. RevenueCat receives a
              device identifier and purchase token from Google Play and returns your entitlement status
              to the App. We do not receive or store your payment card details. We receive only a
              confirmation of whether a valid Pro entitlement is active.
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Lawful basis:</strong> Contract performance (to verify and deliver your Pro subscription).
              <br /><strong>Retention:</strong> Entitlement records held for the duration of your
              subscription plus any legally required period (typically 7 years for financial records
              under Irish law).
            </p>
          </div>

          {/* 1c. Device and app data */}
          <div className="mb-4">
            <h3 className="font-semibold mb-1">1c. Device, App, and Diagnostic Data</h3>
            <p className="text-muted-foreground mb-1">
              We use Sentry (Functional Software, Inc.) for crash reporting and error diagnostics.
              When the App crashes or encounters an error, Sentry may collect: device model and
              manufacturer, Android OS version, app version, stack traces, error messages, and
              a pseudonymous device identifier. Sentry data does not include your vial images, scan
              results, or any health-related information.
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Lawful basis:</strong> Legitimate interests (maintaining app stability and security).
              <br /><strong>Retention:</strong> Crash and diagnostic data retained by Sentry for up to 90 days.
            </p>
          </div>

          {/* 1d. Analytics */}
          <div className="mb-4">
            <h3 className="font-semibold mb-1">1d. Analytics and Attribution Data</h3>
            <p className="text-muted-foreground mb-1">
              We use AppsFlyer, Inc. for install attribution and in-app analytics. AppsFlyer collects:
              a device advertising identifier (Google Advertising ID), IP address (used for geo-attribution,
              then truncated), install source, and in-app events. The in-app events we send to AppsFlyer are
              limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground mb-2">
              <li>
                <strong>scan_complete</strong> — fired when a scan finishes. Includes the scan outcome
                (Pass / Fail / Do Not Use) and the compound profile selected (e.g. "BPC-157"). No vial
                image, scan image, or health data is included.
              </li>
            </ul>
            <p className="text-muted-foreground mb-1">
              This data is used to measure the effectiveness of our advertising campaigns and to
              understand how the App is used at an aggregate level. We do not use analytics data to
              identify individual users or to make automated decisions about you.
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Lawful basis:</strong> Legitimate interests (measuring advertising performance and
              improving the App). You may opt out of personalised advertising via your device's advertising
              settings (Settings → Privacy → Ads → Opt out of Ads Personalisation on Android).
              <br /><strong>Retention:</strong> Attribution and event data retained by AppsFlyer for up
              to 24 months; see{' '}
              <a href="https://www.appsflyer.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-primary underline">appsflyer.com/legal/privacy-policy</a>.
            </p>
          </div>

          {/* 1e. Camera images — free */}
          <div className="mb-4">
            <h3 className="font-semibold mb-1">1e. Vial Images — Free Tier (On-Device Only)</h3>
            <p className="text-muted-foreground">
              When you use the standard scan feature, photographs of your vials are captured, analysed,
              and stored entirely on your device using local algorithms. These images are never transmitted
              to our servers or any third party. We have no access to them. You can delete them at any
              time by clearing scan history within the App or uninstalling the App.
            </p>
          </div>

          {/* 1f. Camera images — Pro */}
          <div className="mb-4">
            <h3 className="font-semibold mb-1">1f. Vial Images — Pro AI Vision</h3>
            <p className="text-muted-foreground mb-1">
              When you use the AI Vision feature (Pro subscribers only), vial photographs are securely
              transmitted over HTTPS to our analysis server for AI-enhanced processing. The following
              applies to all Pro AI Vision image submissions:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground mb-2">
              <li>Images are processed immediately upon receipt (typically within 30 seconds).</li>
              <li>Images are <strong>not stored, logged, retained, or cached</strong> on our servers after the analysis response is returned to your device.</li>
              <li>Images are <strong>not used for AI model training, service improvement, or any secondary purpose</strong>.</li>
              <li>No image is associated with your identity, device, or account on our servers.</li>
              <li>Our analysis server is hosted within the EU/EEA.</li>
            </ul>
            <p className="text-muted-foreground">
              The AI analysis is powered by a third-party AI model provider. Image data is passed to
              the provider solely to generate the analysis response and is not retained by the provider
              beyond that request. We select providers that commit contractually to not training on
              submitted data.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Lawful basis:</strong> Contract performance (to deliver the AI Vision feature you have paid for).
              <br /><strong>Retention:</strong> Zero — images are not retained after processing.
            </p>
          </div>

          {/* 1g. Scan history */}
          <div className="mb-4">
            <h3 className="font-semibold mb-1">1g. Scan History and Session Data (On-Device)</h3>
            <p className="text-muted-foreground">
              All scan sessions, results, timestamps, notes, and thumbnails are stored exclusively
              in your device's local storage. We have no access to this data at any time. It is
              never transmitted to our servers. You can delete it entirely by clearing app data in
              your device settings or uninstalling the App.
            </p>
          </div>
        </section>

        {/* ── 2. How we use data ── */}
        <section>
          <h2 className="text-base font-bold mb-2">2. How We Use Your Data</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>To respond to support enquiries and help requests</li>
            <li>To verify and maintain your Pro subscription entitlement</li>
            <li>To deliver AI Vision analysis results (Pro subscribers only)</li>
            <li>To diagnose crashes and fix technical issues</li>
            <li>To measure install attribution and aggregate in-app behaviour for advertising purposes</li>
          </ul>
          <p className="mt-3 font-semibold text-destructive text-xs">
            We do not use any personal data to make automated decisions with legal or similarly
            significant effects on you. We do not sell your personal data to third parties.
          </p>
        </section>

        {/* ── 3. Third-party processors ── */}
        <section>
          <h2 className="text-base font-bold mb-3">3. Third-Party Data Processors</h2>
          <p className="text-muted-foreground mb-3">
            We do not sell, rent, or share your personal data with third parties for their own
            marketing purposes. Data is shared only with the following processors under written data
            processing agreements:
          </p>
          <div className="bg-card border rounded-xl divide-y text-xs">
            <div className="p-3">
              <p className="font-semibold">Google Play / Google LLC</p>
              <p className="text-muted-foreground">Payment processing and app distribution. Location: USA. Safeguard: Google's standard contractual clauses.</p>
            </div>
            <div className="p-3">
              <p className="font-semibold">RevenueCat, Inc.</p>
              <p className="text-muted-foreground">Subscription entitlement management. Receives device identifier and purchase token. Location: USA. Safeguard: Standard contractual clauses.</p>
            </div>
            <div className="p-3">
              <p className="font-semibold">AppsFlyer, Inc.</p>
              <p className="text-muted-foreground">Install attribution and in-app event analytics (scan_complete events). Receives device advertising ID and IP address. Location: USA / Israel. Safeguard: Standard contractual clauses.</p>
            </div>
            <div className="p-3">
              <p className="font-semibold">Sentry (Functional Software, Inc.)</p>
              <p className="text-muted-foreground">Crash reporting and diagnostics. Receives device model, OS version, app version, and stack traces. Location: USA. Safeguard: Standard contractual clauses. See <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary underline">sentry.io/privacy</a>.</p>
            </div>
            <div className="p-3">
              <p className="font-semibold">AI Model Provider (Pro AI Vision)</p>
              <p className="text-muted-foreground">Processes vial images submitted via AI Vision. Images not retained. Provider contractually prohibited from training on submitted data. Server hosted in EU/EEA.</p>
            </div>
          </div>
        </section>

        {/* ── 4. International transfers ── */}
        <section>
          <h2 className="text-base font-bold mb-2">4. International Data Transfers</h2>
          <p className="text-muted-foreground">
            Several of our processors are based in the United States (Google, RevenueCat, AppsFlyer,
            Sentry). Where personal data is transferred outside the EEA, we rely on the European
            Commission's Standard Contractual Clauses (SCCs) as the transfer mechanism under Article
            46 EU GDPR. We have conducted or are conducting transfer impact assessments for these
            transfers as required. You can request details of the specific SCCs in place by contacting
            us at{' '}
            <a href="mailto:pepscan@peptilog.ie" className="text-primary underline underline-offset-2">pepscan@peptilog.ie</a>.
          </p>
        </section>

        {/* ── 5. Retention ── */}
        <section>
          <h2 className="text-base font-bold mb-2">5. Data Retention Summary</h2>
          <div className="bg-card border rounded-xl divide-y text-xs">
            <div className="p-3 flex justify-between gap-4">
              <span className="text-muted-foreground">Support emails</span>
              <span className="font-medium text-right">Until resolved; max 12 months</span>
            </div>
            <div className="p-3 flex justify-between gap-4">
              <span className="text-muted-foreground">Subscription records</span>
              <span className="font-medium text-right">Duration + 7 years (legal obligation)</span>
            </div>
            <div className="p-3 flex justify-between gap-4">
              <span className="text-muted-foreground">Crash / diagnostic data (Sentry)</span>
              <span className="font-medium text-right">90 days</span>
            </div>
            <div className="p-3 flex justify-between gap-4">
              <span className="text-muted-foreground">Analytics data (AppsFlyer)</span>
              <span className="font-medium text-right">Up to 24 months</span>
            </div>
            <div className="p-3 flex justify-between gap-4">
              <span className="text-muted-foreground">AI Vision images</span>
              <span className="font-medium text-right">Not retained (deleted after processing)</span>
            </div>
            <div className="p-3 flex justify-between gap-4">
              <span className="text-muted-foreground">Scan history (on-device)</span>
              <span className="font-medium text-right">Controlled by you; deleted on uninstall</span>
            </div>
          </div>
        </section>

        {/* ── 6. Your rights ── */}
        <section>
          <h2 className="text-base font-bold mb-2">6. Your Rights Under EU GDPR</h2>
          <p className="text-muted-foreground mb-3">
            As a data subject under EU GDPR, you have the following rights regarding personal data
            we hold about you:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground mb-3">
            <li><strong>Right of access</strong> — request a copy of the personal data we hold about you</li>
            <li><strong>Right to rectification</strong> — request correction of inaccurate or incomplete data</li>
            <li><strong>Right to erasure</strong> — request deletion of your personal data ("right to be forgotten")</li>
            <li><strong>Right to restriction</strong> — request that we limit how we process your data</li>
            <li><strong>Right to data portability</strong> — receive your data in a structured, machine-readable format where applicable</li>
            <li><strong>Right to object</strong> — object to processing based on legitimate interests (including analytics)</li>
            <li><strong>Right to withdraw consent</strong> — where processing is based on consent, withdraw it at any time without affecting prior processing</li>
          </ul>
          <p className="text-muted-foreground mb-3">
            Because all scan data is stored locally on your device, you can exercise your right to
            erasure for scan history at any time by clearing app data in your device settings or
            uninstalling the App. For all other data rights requests, contact us at{' '}
            <a href="mailto:pepscan@peptilog.ie" className="text-primary underline underline-offset-2">pepscan@peptilog.ie</a>.
            We will respond within one calendar month.
          </p>
          <p className="text-muted-foreground">
            You have the right to lodge a complaint with a supervisory authority. Our lead supervisory
            authority is the <strong>Data Protection Commission (DPC), Ireland</strong>{' '}
            (<a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-primary underline">dataprotection.ie</a>).
            If you are resident in another EU/EEA member state, you may also contact your national
            data protection authority.
          </p>
        </section>

        {/* ── 7. Security ── */}
        <section>
          <h2 className="text-base font-bold mb-2">7. Security</h2>
          <p className="text-muted-foreground">
            We take reasonable technical and organisational measures to protect personal data against
            unauthorised access, loss, or destruction. AI Vision images are transmitted using HTTPS
            encryption. We minimise data collection and do not store data beyond what is necessary for
            each purpose described above.
          </p>
        </section>

        {/* ── 8. Changes ── */}
        <section>
          <h2 className="text-base font-bold mb-2">8. Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this policy from time to time. Material changes will be notified by
            updating the date at the top of this page. Continued use of PepScan after a material
            change constitutes your acknowledgement of the revised policy.
          </p>
        </section>

        {/* ── 9. Contact ── */}
        <section>
          <h2 className="text-base font-bold mb-2">9. Contact / Data Controller</h2>
          <p className="text-muted-foreground">
            For all privacy enquiries, data subject rights requests, or complaints, contact:<br />
            <strong>Peptilog Ltd</strong>, Gorey, Co. Wexford, Ireland<br />
            <a href="mailto:pepscan@peptilog.ie" className="text-primary underline underline-offset-2">pepscan@peptilog.ie</a>
          </p>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
}
